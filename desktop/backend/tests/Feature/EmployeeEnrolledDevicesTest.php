<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeEnrolledDevicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_404_for_missing_employee(): void
    {
        $response = $this->getJson('/api/employees/999999/enrolled-devices');
        $response->assertStatus(404)
            ->assertJson(['message' => 'Employee not found']);
    }

    public function test_index_returns_empty_when_employee_has_no_system_user_id(): void
    {
        $company  = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id'     => $company->id,
            'system_user_id' => null,
        ]);

        $response = $this->getJson("/api/employees/{$employee->id}/enrolled-devices");
        $response->assertStatus(200)
            ->assertJson(['data' => [], 'errors' => []]);
    }

    public function test_destroy_returns_404_when_employee_missing(): void
    {
        $response = $this->deleteJson('/api/employees/999999/enrolled-devices/AC1234');
        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_destroy_returns_404_when_device_not_in_employee_company(): void
    {
        $company  = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id'     => $company->id,
            'system_user_id' => 1234,
        ]);

        $response = $this->deleteJson("/api/employees/{$employee->id}/enrolled-devices/UNKNOWN_DEVICE");
        $response->assertStatus(404)
            ->assertJson(['success' => false, 'message' => 'Device not found for this employee']);
    }
}
