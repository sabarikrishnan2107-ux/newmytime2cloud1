<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Company; // Assuming Company model is related to employee
use App\Models\Employee;

class EmployeeStoreFromDeviceTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_store_from_device_api()
    {
        // Set up a company and employee to test uniqueness validation
        $company = Company::factory()->create();

        // Seed an existing employee to test uniqueness constraints
        $existingEmployee = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_id' => 5657,
            'system_user_id' => 5657,
        ]);

        // Define the request payload
        $payload = [
            'employees' => [
                [
                    'company_id' => $company->id,
                    'employee_id' => 1, // Duplicate for testing
                    'full_name' => 'frsd sdfsdf',
                    'system_user_id' => 1, // Duplicate for testing
                    'profile_picture' => '/9j/4AAQSkZJRgABAQAAAQABAAD/wAARCAKAAWADASIeoOEh',
                ],
                [
                    'company_id' => $company->id,
                    'employee_id' => 2, // Duplicate for testing
                    'full_name' => 'frsd sdfsdf',
                    'system_user_id' => 2, // Duplicate for testing
                    'profile_picture' => '/9j/4AAQSkZJRgABAQAAAQABAAD/wAARCAKAAWADASIeoOEh',
                ],
            ]
        ];

        // Make the POST request to the API endpoint
        $response = $this->postJson('/api/employee-store-from-device', $payload);

        // Assert that the response status is 422 for validation failure
        $response->assertStatus(422);

        // Verify the error messages for unique constraints and format validation
        $response->assertJsonValidationErrors([
            'employees.0.employee_id' => 'The employee ID must be unique within the company.',
            'employees.0.system_user_id' => 'The system user ID must be unique within the company.',
            'employees.0.full_name' => 'The full name must be at least 2 characters.',
            'employees.0.profile_picture' => 'The profile picture must be valid base64 data.',
        ]);
    }
}
