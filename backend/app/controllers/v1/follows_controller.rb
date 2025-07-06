class V1::FollowsController < ApplicationController
  allow_unauthenticated_access only: %i[ following followers ]

  # @oas_include
  # @tags Follows
  # @summary List users that the specified user is following
  # @response Success(200) [Hash{following: Array<Hash{id: Integer, username: String, email: String}}}]
  def following
    @user = User.find_by(id: params[:user_id])
    return render_user_not_found unless @user



    # TODO: improve the query?
    following = @user.following.map do |u|
      avatar_url = u.avatar.attached? ? url_for(u.avatar) : nil
      {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: avatar_url
      }
    end

    render json: { following: following }
  end

  # @oas_include
  # @tags Follows
  # @summary List users that follow the specified user
  # @response Success(200) [Hash{followers: Array<Hash{id: Integer, username: String, email: String}}}]
  # @response User not found(404) [Hash{error: String}]
  def followers
    @user = User.find_by(id: params[:user_id])
    return render_user_not_found unless @user

    # TODO: improve the query?
    followers = @user.followers.map do |u|
      avatar_url = u.avatar.attached? ? url_for(u.avatar) : nil
      {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: avatar_url
      }
    end

    render json: { followers: followers }
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
    return render_user_not_found unless @user

    if Current.user.id == @user.id
      render json: { error: "Can't follow oneself" }, status: :unprocessable_entity
    elsif Current.user.following.exists?(@user.id)
      render json: { error: "Already following" }, status: :unprocessable_entity
    else
      Current.user.following << @user
      render json: { message: "Followed successfully" }, status: :created
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
    return render_user_not_found unless @user

    if Current.user.id == @user.id
      render json: { error: "Can't unfollow oneself" }, status: :unprocessable_entity
    elsif !Current.user.following.exists?(@user.id)
      render json: { error: "Already not following" }, status: :unprocessable_entity
    else
      Current.user.following.delete(@user)
      render json: { message: "Unfollowed successfully" }, status: :ok
    end
  end

  private

  def render_user_not_found
    render json: { error: "User not found" }, status: :not_found
  end
end
