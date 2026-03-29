<?php

namespace Tests\Feature\Config;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ConfigApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_countries_options_are_returned_from_backend_proxy(): void
    {
        Http::fake([
            '*' => Http::response([
                ['name' => ['common' => 'Singapore']],
                ['name' => ['common' => 'India']],
                ['name' => ['common' => 'Singapore']],
            ], 200),
        ]);

        $response = $this->getJson('/api/countries/options');

        $response
            ->assertOk()
            ->assertJsonPath('data.source', 'remote')
            ->assertJsonPath('data.options.0', 'India')
            ->assertJsonPath('data.options.1', 'Singapore');
    }

    public function test_countries_options_fall_back_when_remote_service_fails(): void
    {
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $response = $this->getJson('/api/countries/options');

        $response
            ->assertOk()
            ->assertJsonPath('data.source', 'fallback')
            ->assertJsonPath('data.options.0', 'India');
    }
}
