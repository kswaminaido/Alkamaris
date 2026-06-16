<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Config;
use App\Services\Audit\UserEventLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class ConfigController extends Controller
{
    public function __construct(
        private readonly UserEventLogger $userEventLogger,
    ) {}

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
            'data.*' => ['required', 'string', 'max:255'],
        ]);

        $config = Config::query()->create($validated);

        $this->userEventLogger->log(
            $request->user(),
            'Config',
            'Config created',
            $config->id,
            newValues: $config->toArray(),
            description: "Config created with ID {$config->id}",
        );

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
            'data.*' => ['required', 'string', 'max:255'],
        ]);

        $oldValues = $config->toArray();
        $config->update($validated);
        $updated = $config->fresh();

        $this->userEventLogger->log(
            $request->user(),
            'Config',
            'Config updated',
            $updated->id,
            oldValues: $oldValues,
            newValues: $updated->toArray(),
            description: "Config updated with ID {$updated->id}",
        );

        return response()->json(['data' => $updated]);
    }

    public function destroy(Config $config): JsonResponse
    {
        $oldValues = $config->toArray();
        $config->delete();

        $this->userEventLogger->log(
            request()->user(),
            'Config',
            'Config deleted',
            $config->id,
            oldValues: $oldValues,
            description: "Config deleted with ID {$config->id}",
        );

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

    public function appendOption(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'max:100'],
            'value' => ['required', 'string', 'max:255'],
        ]);

        $value = trim($validated['value']);
        $config = Config::query()->firstOrCreate(
            ['type' => $validated['type']],
            ['data' => []],
        );

        $oldValues = $config->toArray();
        $options = collect(is_array($config->data) ? $config->data : [])
            ->filter(fn (mixed $option): bool => is_string($option) && trim($option) !== '')
            ->map(fn (string $option): string => trim($option))
            ->values();

        if (! $options->contains(fn (string $option): bool => mb_strtolower($option) === mb_strtolower($value))) {
            $options->push($value);
        }

        $config->forceFill(['data' => $options->unique()->sort()->values()->all()])->save();
        $updated = $config->fresh();

        $this->userEventLogger->log(
            $request->user(),
            'Config',
            'Config option appended',
            $updated->id,
            oldValues: $oldValues,
            newValues: $updated->toArray(),
            description: "Config option appended with ID {$updated->id}",
            context: ['option' => $value],
        );

        return response()->json(['data' => $updated]);
    }

    public function countries(): JsonResponse
    {
        $fallback = ['India', 'Singapore', 'United Arab Emirates', 'Jordan', 'Netherlands', 'Vietnam'];

        try {
            $response = Http::timeout(10)->acceptJson()->get((string) config('services.countries.url'));

            if (! $response->successful()) {
                return response()->json([
                    'data' => [
                        'options' => $fallback,
                        'source' => 'fallback',
                    ],
                ]);
            }

            $options = collect($response->json())
                ->map(fn (mixed $entry): string => is_array($entry) ? trim((string) data_get($entry, 'name.common', '')) : '')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            return response()->json([
                'data' => [
                    'options' => $options !== [] ? $options : $fallback,
                    'source' => $options !== [] ? 'remote' : 'fallback',
                ],
            ]);
        } catch (\Throwable) {
            return response()->json([
                'data' => [
                    'options' => $fallback,
                    'source' => 'fallback',
                ],
            ]);
        }
    }
}
