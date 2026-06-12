<?php

namespace App\Http\Controllers\Mqtt;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Device; // assume you have devices table with `device_id` and `timezone`

class FaceDeviceController extends Controller
{
    protected string $gatewayBase1;

    // public function gatewayBase()
    // {
    //     return  rtrim(
    //         config('services.mqtt_gateway.url', env('MQTT_GATEWAY_URL', 'http://127.0.0.1:4000')),
    //         '/'
    //     );
    // }

    public function gatewayRequest(string $method, string $path, array $body = [], array $query = [])
    {
        try {


            $url = rtrim(
                config('services.mqtt_gateway.url', env('MQTT_GATEWAY_URL', 'http://127.0.0.1:4000')),
                '/'
            ) . '/' . ltrim($path, '/');

            $client = Http::withoutVerifying()->acceptJson()->timeout(60);

            if (!empty($query)) {
                $client = $client->withOptions([
                    'query' => $query
                ]);
            }




            switch (strtoupper($method)) {
                case 'GET':
                    $response = $client->get($url);
                    break;
                case 'POST':
                    $response = $client->post($url, $body);
                    break;
                case 'DELETE':
                    if (!empty($body)) {
                        $response = $client
                            ->withBody(json_encode($body), 'application/json')
                            ->delete($url);
                    } else {
                        $response = $client->delete($url);
                    }
                    break;
                default:
                    return response()->json(['error' => "Unsupported method $method"], 500);
            }

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return    ['error' => "MQTT Gateway Error" . $e->getMessage()];
        }
    }

    /* 1. Device online status */
    public function getStatus(string $deviceId)
    {
        return $this->gatewayRequest('GET', "api/device/{$deviceId}/status");
    }

    /* 2. Device door open */
    public function openDoor(string $deviceId)
    {
        return $this->gatewayRequest('POST', "api/device/{$deviceId}/open-door");
    }

    /* 3. Device door close (not supported in protocol, returns info) */
    public function closeDoor(string $deviceId)
    {
        return $this->gatewayRequest('POST', "api/device/{$deviceId}/close-door");
    }

    /* 4. Device get timezone (App-level, not MQTT) */
    // public function getTimezone(string $deviceId)
    // {
    //     $device = Device::where('device_id', $deviceId)->first();

    //     return response()->json([
    //         'device_id' => $deviceId,
    //         'timezone'  => $device->timezone ?? 'Asia/Dubai',
    //     ]);
    // }

    /* 5. Device set timezone (App-level, not MQTT) */
    // public function setTimezone(Request $request, string $deviceId)
    // {
    //     $request->validate([
    //         'timezone' => 'required|timezone',
    //     ]);

    //     $device = Device::firstOrCreate(['device_id' => $deviceId]);
    //     $device->timezone = $request->input('timezone');
    //     $device->save();

    //     return response()->json([
    //         'message'  => 'Timezone updated',
    //         'device_id' => $deviceId,
    //         'timezone' => $device->timezone,
    //     ]);
    // }

    // /* 6. Device get time (GetSysTime) */
    // public function getTimezone(string $deviceId)
    // {
    //     return $this->gatewayRequest('GET', "api/device/{$deviceId}/time");
    // }

    // /* 6. Device set time (SetSysTime) */
    // public function setTimezone(Request $request, string $deviceId)
    // {


    //     $request->validate([
    //         'sysTime' => 'required|string',
    //     ]);

    //     return $this->gatewayRequest('POST', "api/device/{$deviceId}/time", [
    //         'sysTime' => $request->input('sysTime'),
    //     ]);
    // }

    public function getTime(string $deviceId)
    {
        return $this->gatewayRequest('GET', "api/device/{$deviceId}/time");
    }

    /* 6. Device set time (SetSysTime) */
    public function setTime(Request $request, string $deviceId)
    {


        $request->validate([
            'sysTime' => 'required|string',
        ]);

        return $this->gatewayRequest('POST', "api/device/{$deviceId}/time", [
            'sysTime' => $request->input('sysTime'),
        ]);
    }

    /* 7 & 8. Add / Edit Person */
    public function savePerson(Request $request, string $deviceId)
    {
        // Body must include customId, name, etc.
        return $this->gatewayRequest('POST', "api/device/{$deviceId}/person", $request->all());
    }

    /* 9. Batch add persons */
    public function batchSavePersons(Request $request, string $deviceId)
    {
        // Expect: { "persons": [ {...}, {...} ] }
        return $this->gatewayRequest('POST', "api/device/{$deviceId}/persons/batch", $request->all());
    }

    /* 10. Delete single person */
    public function deletePerson(string $deviceId, string $customId)
    {
        return $this->gatewayRequest('DELETE', "api/device/{$deviceId}/person/{$customId}");
    }

    /* 10. Batch delete persons */
    public function batchDeletePersons(Request $request, string $deviceId)
    {
        // Expect: { "customIds": ["ID1", "ID2"] }
        return $this->gatewayRequest('POST', "api/device/{$deviceId}/persons/batch-delete", $request->all());
    }

    /* 11. Search person (by customId) */
    public function getPerson(Request $request, string $deviceId, string $customId)
    {
        $query = [];
        if ($request->filled('picture')) {
            $query['picture'] = 1;
        }

        return $this->gatewayRequest('GET', "api/device/{$deviceId}/person/{$customId}", [], $query);
    }

    /* 12. Get all persons list */
    public function getAllPersons(string $deviceId)
    {
        return $this->gatewayRequest('GET', "api/device/{$deviceId}/persons/list");
    }

    /* Optional: search persons list (filters) */
    public function searchPersonList(Request $request, string $deviceId)
    {
        return $this->gatewayRequest('POST', "api/device/{$deviceId}/persons/search", $request->all());
    }
}
