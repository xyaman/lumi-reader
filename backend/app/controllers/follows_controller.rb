class FollowsController < ApplicationController
  before_action :authorize_request, only: [ :create ]

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

  def destroy
  end

  # GET /following
  def following
    user = User.find_by(id: params[:id])
    if user then
      render json: { followers: user.following }
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # GET /followers
  def followers
    user = User.find_by(id: params[:id])
    if user then
      render json: { followers: user.followers }
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end
end
