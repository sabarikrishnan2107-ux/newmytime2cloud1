<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    // Get all FAQs
    public function FAQList()
    {

        $query = request('query');

        $faqs = Faq::query()
            ->when($query, function ($queryBuilder, $query) {
                // Split the query into individual words
                $words = explode(' ', $query);
                $words = array_filter($words, fn($value) => !in_array($value, ["how", "to", "what", "do"]));
                $words = array_values($words);

                // Loop through each word and create a WHERE condition for each
                $queryBuilder->where(function ($q) use ($words) {
                    foreach ($words as $word) {
                        // Add a WHERE condition for each word to match inside the question
                        $q->where('search_terms', 'LIKE', "%$word%");
                    }
                });
            })
            ->orderByDesc("id")
            ->get(["question", "answer", "search_terms"]);

        return response()->json(["ask_ai" => env("ASK_AI", false), "data" => $faqs], 200);
    }

    public function index()
    {
        $query = request('query');

        $faqs = Faq::query()
            ->when($query, function ($queryBuilder, $query) {
                // Split query into words and make them lowercase
                $words = explode(' ', strtolower($query));

                // Apply a LIKE search for each word, case-insensitive
                $queryBuilder->where(function ($q) use ($words) {
                    foreach ($words as $word) {
                        $q->orWhereRaw('LOWER(question) LIKE ?', ["%$word%"]);
                    }
                });
            })
            ->orderByDesc("id")
            ->paginate(request("per_page", 100));

        return response()->json($faqs, 200);
    }


    // Create a new FAQ
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'question' => 'required|string|max:255',
            'search_terms' => 'required|string|max:255',
            'answer' => 'required|string',
        ]);

        try {
            $record = Faq::create($validatedData);

            if ($record) {
                return $this->response('FAQ successfully added.', $record, true);
            } else {
                return $this->response('FAQ cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    // Update an existing FAQ
    public function update(Request $request, $id)
    {
        $request->validate([
            'question' => 'required|string|max:255',
            'search_terms' => 'required|string|max:255',
            'answer' => 'required|string',
        ]);

        try {
            $faq = Faq::findOrFail($id);

            $faq->update($request->all());

            if ($faq) {
                return $this->response('FAQ successfully udapted.', $faq, true);
            } else {
                return $this->response('FAQ cannot udapte.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    // Delete an FAQ
    public function destroy($id)
    {
        try {
            $record = Faq::find($id)->delete();

            if ($record) {
                return $this->response('Faq successfully deleted.', null, true);
            } else {
                return $this->response('Faq cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
