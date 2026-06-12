<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class ImageController extends Controller
{
    public function getBase64Image(Request $request)
    {
        $imageUrl = $request->input('url');

        if (empty($imageUrl)) {
            return response()->json(['error' => 'Image URL is required'], 400);
        }

        try {
            $client = new Client();
            
            // 🚨 THE KEY STEP: Disable SSL verification for this request
            $response = $client->get($imageUrl, [
                'verify' => false, // Disables SSL certificate verification
                'http_errors' => true // Ensure Guzzle throws exception on 4xx/5xx errors
            ]);

            // Get the binary image content
            $imageContent = $response->getBody()->getContents();
            
            // Get the MIME type from the headers
            $contentType = $response->getHeaderLine('Content-Type') ?: 'image/jpeg';
            
            // Convert binary content to Base64
            $base64Data = base64_encode($imageContent);

            // You can return the full Data URL or just the raw data
            $fullDataUrl = "data:{$contentType};base64,{$base64Data}";

            // Since you only wanted the raw data, we extract it here:
            // $base64DataOnly = explode(',', $fullDataUrl, 2)[1];

            return $base64Data;

            return response()->json([
                'base64_data' => $base64Data, // This is the raw data
                'mime_type' => $contentType
            ]);

        } catch (RequestException $e) {
            // Log the error for debugging
            \Log::error('Guzzle Request Failed: ' . $e->getMessage());
            
            // Return a client-friendly error
            return response()->json([
                'error' => 'Failed to fetch image from external URL.',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}