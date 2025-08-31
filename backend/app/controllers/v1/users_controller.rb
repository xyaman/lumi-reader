class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ show following followers recent_reading_sessions ]

  def show
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found." unless user

    render_success data: UserBlueprint.render_as_json(user, view: :show)
  end

  def following
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user
    render_success data: UserBlueprint.render_as_json(user.following, view: :presence)
  end

  def followers
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user
    render_success data: UserBlueprint.render_as_json(user.followers, view: :presence)
  end

  def follow
    user_to_follow = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user_to_follow

    Current.user.following << user_to_follow
    render_success
  end

  def unfollow
    user_to_unfollow = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user_to_unfollow

    unless Current.user.following.include?(user_to_unfollow)
      return render_error errors: "You are not following this user."
    end

    Current.user.following.delete(user_to_unfollow)
    render_success
  end

  def recent_reading_sessions
    user = User.find_by(username: params[:username])
    return render_error message: "User not found.", status: :not_found unless user

    reading_sessions = user.reading_sessions.order(updated_at: :desc)
    pagy, paginated_sessions = pagy(reading_sessions, items: 20, page: params[:page].to_i || 1)
    render_success data: {
      sessions: ReadingSessionBlueprint.render_as_json(paginated_sessions),
      pagy: {
        page: pagy.page,
        pages: pagy.pages,
        count: pagy.count
      }
    }
  end
end
