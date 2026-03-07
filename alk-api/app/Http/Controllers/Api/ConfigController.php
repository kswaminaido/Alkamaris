<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Config;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class ConfigController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Config::query()->orderBy('type')->get(),
        ]);
    }

    public function show(Config $config): JsonResponse
    {
        return response()->json(['data' => $config]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'max:100', 'unique:configs,type'],
            'data' => ['required', 'array'],
            'data.*' => ['required', 'string', 'max:100'],
        ]);

        $config = Config::query()->create($validated);

        return response()->json(['data' => $config], Response::HTTP_CREATED);
    }

    public function update(Request $request, Config $config): JsonResponse
    {
        $validated = $request->validate([
            'type' => [
                'required',
                'string',
                'max:100',
                Rule::unique('configs', 'type')->ignore($config->id),
            ],
            'data' => ['required', 'array'],
            'data.*' => ['required', 'string', 'max:100'],
        ]);

        $config->update($validated);

        return response()->json(['data' => $config->fresh()]);
    }

    public function destroy(Config $config): JsonResponse
    {
        $config->delete();

        return response()->json(
            ['message' => 'Config deleted successfully.'],
            Response::HTTP_OK,
        );
    }

    public function options(string $type): JsonResponse
    {
        return response()->json([
            'data' => [
                'type' => $type,
                'options' => Config::optionsByType($type),
            ],
        ]);
    }
}
