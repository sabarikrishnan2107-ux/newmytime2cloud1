<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    /**
     * Get list of employees the user can chat with.
     * Same branch only (unless manager/admin who can chat with anyone).
     */
    public function contacts(Request $request)
    {
        $user = $request->user() ?? User::find($request->user_id);
        if (!$user) {
            return response()->json(['data' => [], 'message' => 'User not found'], 200);
        }
        $companyId = $request->company_id ?? $user->company_id;

        $query = Employee::where('company_id', $companyId)
            ->select('id', 'first_name', 'last_name', 'profile_picture', 'branch_id', 'department_id', 'designation_id', 'employee_id')
            ->with(['branch:id,branch_name', 'department:id,name', 'designation:id,name']);

        // Non-managers can only see same branch
        $isManager = in_array($user->role_id, [5]); // role_id 5 = manager
        if (!$isManager) {
            $myEmployee = Employee::find($user->employee_id);
            if ($myEmployee && $myEmployee->branch_id) {
                $query->where('branch_id', $myEmployee->branch_id);
            }
        }

        // Exclude self
        $query->where('id', '!=', $user->employee_id);

        $employees = $query->orderBy('first_name')->get();

        // Add unread count per contact
        $unreadCounts = ChatMessage::where('receiver_id', $user->employee_id)
            ->where('is_read', false)
            ->select('sender_id', DB::raw('count(*) as unread'))
            ->groupBy('sender_id')
            ->pluck('unread', 'sender_id');

        // Add last message per contact
        $employees = $employees->map(function ($emp) use ($user, $unreadCounts) {
            $lastMsg = ChatMessage::where(function ($q) use ($emp, $user) {
                $q->where('sender_id', $user->employee_id)->where('receiver_id', $emp->id);
            })->orWhere(function ($q) use ($emp, $user) {
                $q->where('sender_id', $emp->id)->where('receiver_id', $user->employee_id);
            })->orderBy('created_at', 'desc')->first();

            $emp->last_message = $lastMsg ? $lastMsg->message : null;
            $emp->last_message_time = $lastMsg ? $lastMsg->created_at->format('h:i A') : null;
            $emp->unread_count = $unreadCounts[$emp->id] ?? 0;

            return $emp;
        });

        // Sort by last message time (most recent first)
        $sorted = $employees->sortByDesc(function ($emp) {
            return $emp->last_message_time ?? '';
        })->values();

        return response()->json(['data' => $sorted]);
    }

    /**
     * Get messages between two users.
     */
    public function messages(Request $request, $contactId)
    {
        $user = $request->user() ?? User::find($request->user_id);
        if (!$user) return response()->json(['data' => []]);
        $myId = $user->employee_id;
        $perPage = $request->per_page ?? 50;

        $messages = ChatMessage::where(function ($q) use ($myId, $contactId) {
            $q->where('sender_id', $myId)->where('receiver_id', $contactId);
        })->orWhere(function ($q) use ($myId, $contactId) {
            $q->where('sender_id', $contactId)->where('receiver_id', $myId);
        })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        // Mark received messages as read
        ChatMessage::where('sender_id', $contactId)
            ->where('receiver_id', $myId)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json($messages);
    }

    /**
     * Send a message.
     */
    public function send(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|integer',
            'message' => 'nullable|string|max:5000',
            'file' => 'nullable|file|max:10240',
        ]);

        $user = $request->user() ?? User::find($request->user_id);
        if (!$user) return response()->json(['status' => false, 'message' => 'User not found']);
        $myId = $user->employee_id;
        $companyId = $request->company_id ?? $user->company_id;

        // Verify receiver is in same branch (for non-managers)
        $isManager = in_array($user->role_id, [5]);
        if (!$isManager) {
            $myEmployee = Employee::find($myId);
            $receiver = Employee::find($request->receiver_id);

            if ($myEmployee && $receiver && $myEmployee->branch_id != $receiver->branch_id) {
                return response()->json([
                    'status' => false,
                    'message' => 'You can only message employees in your branch',
                ], 403);
            }
        }

        // Handle file upload
        $attachmentPath = null;
        $type = $request->type ?? 'text';
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->move(public_path('chat_uploads'), $filename);
            $attachmentPath = $filename;
            // Determine type from extension since getMimeType may not work
            $ext = strtolower($file->getClientOriginalExtension());
            $imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
            $type = in_array($ext, $imageExts) ? 'image' : 'file';
        }

        $message = ChatMessage::create([
            'sender_id' => $myId,
            'receiver_id' => $request->receiver_id,
            'company_id' => $companyId,
            'branch_id' => Employee::find($myId)?->branch_id,
            'message' => $request->message ?? ($attachmentPath ? $attachmentPath : ''),
            'type' => $type,
            'attachment' => $attachmentPath,
        ]);

        return response()->json([
            'status' => true,
            'data' => $message,
        ]);
    }

    /**
     * Get unread message count.
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user() ?? User::find($request->user_id);
        if (!$user) return response()->json(['unread' => 0]);
        $count = ChatMessage::where('receiver_id', $user->employee_id)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread' => $count]);
    }
}
