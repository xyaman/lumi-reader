class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ create confirm search ]
  wrap_parameters :user, include: [ :password, :password_confirmation ]

  # @oas_include
  # @tags Users
  # @no_auth
  # @summary Create a User
  # @request_body The user to be created [!Hash{user: Hash{email: String, username: String, password: String, password_confirmation: String }}]
  # @response User created successfully(201) [Hash{user: Hash{id: Integer, email: String, username: String}}]
  # @response Validation failed(422) [Hash{errors: Array<String>}]
  def create
    @user = User.new(user_params)
    if @user.save
      UserMailer.confirmation_email(@user).deliver_later
      render json: { message: "Please check your email to confirm your account." }, status: :created
    else
      render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # @oas_include
  # @tags Users
  # @summary Update a user's avatar
  # @request_body Avatar image file to upload [!Multipart{avatar: File}]
  # @response Avatar updated successfully(200) [Hash{message: String}]
  # @response User not found(404) [Hash{error: String}]
  # @response Missing avatar file(422) [Hash{error: String}]
  def update_avatar
    user = Current.user

    if params[:avatar].present?
      if params[:avatar].size > 2.megabytes
        return render json: { error: "Avatar is too big (max 2MB)." }, status: :unprocessable_entity
      end

      # automatically removes from the storage the previous one
      user.avatar.attach(params[:avatar])
      avatar_url = url_for(user.avatar)

      render json: { avatar_url: avatar_url }, status: :ok
    else
      render json: { error: "Missing avatar file." }, status: :unprocessable_entity
    end
  end

  # @oas_include
  # @tags Users
  # @summary Update a user's description
  # @request_body The new description [Hash{description: String}]
  # @response Description updated successfully(200) [Hash{message: String, description: String}]
  # @response Validation failed(422) [Hash{errors: Array<String>}]
  def update_description
    user = Current.user
    puts params.inspect
    if user.update(description: params[:description])
      puts user.description
      render json: { message: "Description updated successfully.", description: user.description }, status: :ok
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # @oas_include
  # @tags Users
  # @summary Show a User
  # @response User found(200) [Hash{user: Hash{id: Integer, email: String, username: String, description: String, share_reading_data: Boolean, following_count: Integer, followers_count: Integer}}]
  # @response User not found(404) [Hash{error: String}]
  #
  # Returns the user with the given ID.
  def show
    user = User.find_by(id: params[:id])
    if user

      following_count = user.following.count
      followers_count = user.followers.count

      json_user = user.slice(:id, :email, :username, :description, :share_reading_data)
      json_user[:avatar_url] = user.avatar.attached? ? url_for(user.avatar) : nil
      json_user.merge!(following_count: following_count, followers_count: followers_count)

      render json: { user: json_user }, status: :ok
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # @oas_include
  # @tags Users
  # @summary Confirm a User
  # @parameter token(query) [!String] required The confirmation token
  # @parameter api(query) [Boolean] optional Return JSON instead of redirect
  # @response Account confirmed(200) [Hash{message: String}]
  # @response Invalid or expired confirmation token(404) [Hash{error: String}]
  def confirm
    user = User.find_by(confirmation_token: params[:token])
    puts params
    base_url = ENV["FRONTEND_URL"].presence || "http://localhost:5173"
    login_url = "#{base_url}/login"

    # If `params[:api]` is present, return JSON
    # If not, redirect to the login page with the appropriate status.
    if params[:api].present?
      if user&.confirmed?
        render json: { message: "Account already confirmed." }, status: :ok
      elsif user
        user.confirm!
        render json: { message: "Account confirmed. You can now sign in." }, status: :ok
      else
        render json: { error: "Invalid or expired confirmation token." }, status: :not_found
      end
    else
      if user&.confirmed?
        redirect_to "#{login_url}?status=already_confirmed"
      elsif user
        user.confirm!
        redirect_to "#{login_url}?status=confirmed"
      else
        redirect_to "#{login_url}?status=invalid_token"
      end
    end
  end

  # @oas_include
  # @tags Users
  # @summary Search users by username
  # @parameter q(query) [!String] required The username query string
  # @parameter page(query) [Integer] optional Page number
  # @parameter items(query) [Integer] optional Items per page
  # @response List of users with pagination(200) [Hash{ users: Array<Hash{id: Integer, username: String}>, pagy: Hash{ page: Integer, items: Integer, pages: Integer, count: Integer } }]
  def search
    if params[:q].present?
      users_scope = User.find_by_username(params[:q])
      pagy, users = pagy(users_scope, items: params[:items] || 20)

      users_json = users.map do |user|
        {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar.attached? ? url_for(user.avatar) : nil
        }
      end

      render json: {
        users: users_json,
        page: pagy.page,
        pages: pagy.pages,
        count: pagy.count
      }, status: :ok
    else
      render json: { error: "Query parameter 'q' is required." }, status: :bad_request
    end
  end


  private
  def user_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end
end
