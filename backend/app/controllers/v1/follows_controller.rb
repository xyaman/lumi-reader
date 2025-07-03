class V1::FollowsController < ApplicationController
  allow_unauthenticated_access only: %i[ following followers ]

  # @oas_include
  # @tags Follows
  # @summary List users that the specified user is following
  # @response Success(200) [Hash{following: Array<User>}]
  # @response User not found(404) [Hash{error: String}]
  def following
    user = User.find_by(id: params[:user_id])
    if user then
      render json: { following: user.following }
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # @oas_include
  # @tags Follows
  # @summary List users that follow the specified user
  # @response Success(200) [Hash{followers: Array<User>}]
  # @response User not found(404) [Hash{error: String}]
  def followers
    puts params
    user = User.find_by(id: params[:user_id])
    if user then
      render json: { followers: user.followers }
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # @oas_include
  # @tags Follows
  # @summary Current user follows another user
  # @response Followed successfully(201) [Hash{message: String}]
  # @response User not found(404) [Hash{error: String}]
  # @response Can't follow to oneself(422) [Hash{error: String}]
  # @response Already following(422) [Hash{error: String}]
  def create
    user_to_follow = User.find_by(id: params[:user_id])
    return render json: { error: "User not found" }, status: :not_found unless user_to_follow

    if Current.user.id == user_to_follow.id
      return render json: { error: "Can't follow to oneself" }, status: :unprocessable_entity
    end

    if Current.user.following.include?(user_to_follow)
      return render json: { error: "Already following" }, status: :unprocessable_entity
    end

    Current.user.following << user_to_follow
    render json: { message: "Followed successfully" }, status: :created
  end

  # @oas_include
  # @tags Follows
  # @summary Current user unfollows another user
  # @response Unfollowed successfully(200) [Hash{message: String}]
  # @response User not found(404) [Hash{error: String}]
  # @response Can't unfollow to oneself(422) [Hash{error: String}]
  # @response Already not following(422) [Hash{error: String}]
  def destroy
    user_to_unfollow = User.find_by(id: params[:user_id])
    return render json: { error: "User not found" }, status: :not_found unless user_to_unfollow

    if Current.user.id == user_to_unfollow.id
      return render json: { error: "Can't unfollow to oneself" }, status: :unprocessable_entity
    end

    if not Current.user.following.include?(user_to_unfollow)
      return render json: { error: "Already not following" }, status: :unprocessable_entity
    end

    Current.user.following.delete(user_to_unfollow)
    render json: { message: "Unfollowed successfully" }, status: :ok
  end
end
