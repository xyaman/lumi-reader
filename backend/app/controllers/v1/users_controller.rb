class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ index show following followers following_presence recent_reading_sessions ]

  def index
    return render_error errors: "`query` parameter is not present" unless params[:query]

    users = User.search(params[:query]) || []
    render_success data: UserBlueprint.render_as_json(users, view: :show)
  end

  def show
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found." unless user

    blueprint_options = { view: :show }
    blueprint_options[:is_following] = Follow.exists?(follower_id: Current.user.id, followed_id: user.id) if Current.user

    render_success data: UserBlueprint.render_as_json(user, **blueprint_options)
  end

  def following
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user

    page = params[:page].to_i
    page = 1 if page < 1

    pagy, paginated_following = pagy(user.following, items: 20, page: page)
    render_success data: {
      users: UserBlueprint.render_as_json(paginated_following, view: :presence),
      pagy: {
        page: pagy.page,
        pages: pagy.pages,
        count: pagy.count
      }
    }
  end

  def followers
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user

    # @Todo(xyaman): check nil.to_i => 0? || 1 => 0?
    page = params[:page].to_i
    page = 1 if page < 1

    pagy, paginated_followers = pagy(user.followers, items: 20, page: page)
    render_success data: {
      users: UserBlueprint.render_as_json(paginated_followers, view: :presence),
      pagy: {
        page: pagy.page,
        pages: pagy.pages,
        count: pagy.count
      }
    }
  end

  def following_presence
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found.", status: :not_found unless user

    # @Speed(xyaman): ok for now, but this needs to be improved
    following = user.following.to_a
    following.sort_by! { |u| u.presence[:status] == "online" ? 0 : 1 }

    render_success data: UserBlueprint.render_as_json(following, view: :presence)
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
