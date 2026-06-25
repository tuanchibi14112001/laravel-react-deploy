<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;

class UserController extends Controller
{
    /**
     * Danh sách user (có phân trang).
     */
    public function index()
    {
        $users = User::query()->latest()->paginate(10);

        return UserResource::collection($users);
    }

    /**
     * Tạo mới user.
     */
    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Xem chi tiết user.
     */
    public function show(User $user)
    {
        return new UserResource($user);
    }

    /**
     * Cập nhật user.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $user->update($request->validated());

        return new UserResource($user);
    }

    /**
     * Xóa user.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'Xóa user thành công.',
        ]);
    }
}
