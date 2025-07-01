class FollowsController < ApplicationController
  before_action :authorize_request, only: [ :create, :destroy ]

  # POST /follows/:id
  # Current user follows another user
  def create
    user_to_follow = User.find_by(id: params[:id])
    return render json: { error: "User not found" }, status: :not_found unless user_to_follow

    if @current_user.id == user_to_follow.id
      return render json: { error: "Can't follow to oneself" }, status: :unprocessable_entity
    end

    if @current_user.following.include?(user_to_follow)
      return render json: { error: "Already following" }, status: :unprocessable_entity
    end

    @current_user.following << user_to_follow
    render json: { message: "Followed successfully" }, status: :created
  end

  # DELETE /follows/:id
  # Current user unfollows another user
  def destroy
    user_to_unfollow = User.find_by(id: params[:id])
    return render json: { error: "User not found" }, status: :not_found unless user_to_unfollow

    if @current_user.id == user_to_unfollow.id
      return render json: { error: "Can't unfollow to oneself" }, status: :unprocessable_entity
    end

    if not @current_user.following.include?(user_to_unfollow)
      return render json: { error: "Already not following" }, status: :unprocessable_entity
    end

    @current_user.following.delete(user_to_unfollow)
    render json: { message: "Unfollowed successfully" }, status: :ok
  end

  # GET /following
  # List users that the specified user is following
  def following
    user = User.find_by(id: params[:id])
    if user then
      render json: { followers: user.following }
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # GET /followers
  # List users that follow the specified user
  def followers
    user = User.find_by(id: params[:id])
    if user then
      render json: { followers: user.followers }
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end
end
