class V1::FollowsController < ApplicationController
  allow_unauthenticated_access only: %i[ following followers ]

  # @oas_include
  # @tags Follows
  # @summary List users that the specified user is following
  # @parameter presence(query) [String] if presence is 1, it will send also the following status
  # @response Success(200) [Hash{following: Array<Hash{id: Integer, username: String, email: String}>}}]
  def following
    @user = User.find_by(id: params[:user_id])
    return user_not_found_response unless @user

    following_users = @user.following.includes(avatar_attachment: :blob)
    if params[:presence]&.to_i == 1
      serialized_users = UserSerializer.collection_with_presence(following_users)
    else
      serialized_users = UserSerializer.collection(following_users)
    end

    success_response({ following: serialized_users })
  end

  # @oas_include
  # @tags Follows
  # @summary List users that follow the specified user
  # @response Success(200) [Hash{followers: Array<Hash{id: Integer, username: String, email: String}>}}]
  # @response User not found(404) [Hash{error: String}]
  def followers
    @user = User.find_by(id: params[:user_id])
    return user_not_found_response unless @user

    followers_users = @user.followers.includes(avatar_attachment: :blob)
    serialized_users = UserSerializer.collection(followers_users)

    success_response({ followers: serialized_users })
  end

  # @oas_include
  # @tags Follows
  # @summary Current user follows another user
  # @response Followed successfully(201) [Hash{message: String}]
  # @response User not found(404) [Hash{error: String}]
  # @response Can't follow oneself(422) [Hash{error: String}]
  # @response Already following(422) [Hash{error: String}]
  def update
    @user = User.find_by(id: params[:id])
    return user_not_found_response unless @user

    if Current.user.id == @user.id
      error_response("Can't follow oneself")
    elsif Current.user.following.exists?(@user.id)
      error_response("Already following")
    else
      Current.user.following << @user
      success_response({ message: "Followed successfully" }, status: :created)
    end
  end

  # @oas_include
  # @tags Follows
  # @summary Current user unfollows another user
  # @response Unfollowed successfully(200) [Hash{message: String}]
  # @response User not found(404) [Hash{error: String}]
  # @response Can't unfollow oneself(422) [Hash{error: String}]
  # @response Already not following(422) [Hash{error: String}]
  def destroy
    @user = User.find_by(id: params[:id])
    return user_not_found_response unless @user

    if Current.user.id == @user.id
      error_response("Can't unfollow oneself")
    elsif !Current.user.following.exists?(@user.id)
      error_response("Already not following")
    else
      Current.user.following.delete(@user)
      success_response({ message: "Unfollowed successfully" })
    end
  end
end
