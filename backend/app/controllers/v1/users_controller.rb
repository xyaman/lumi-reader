class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ create confirm search show ]
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
      success_response({ message: "Please check your email to confirm your account." }, status: :created)
    else
      error_response(@user.errors)
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

    unless params[:avatar].present?
      return error_response("Missing avatar file.")
    end

    if params[:avatar].size > 2.megabytes
      return error_response("Avatar is too big (max 2MB).")
    end

    user.avatar.attach(params[:avatar])
    avatar_url = url_for(user.avatar)

    success_response({ avatar_url: avatar_url })
  end

  # @oas_include
  # @tags Users
  # @summary Update a user's description
  # @request_body The new description [Hash{description: String}]
  # @response Description updated successfully(200) [Hash{message: String, description: String}]
  # @response Validation failed(422) [Hash{errors: Array<String>}]
  def update_description
    user = Current.user
    if user.update(description: params[:description])
      success_response({
        message: "Description updated successfully.",
        description: user.description
      })
    else
      error_response(user.errors)
    end
  end

  # @oas_include
  # @tags Users
  # @summary Update a user's status
  # @request_body The new status [Hash{share_status: Boolean}]
  # @response Description updated successfully(200) [Hash{message: String, share_status: Boolean}]
  # @response Validation failed(422) [Hash{errors: Array<String>}]
  def update_share_status
    user = Current.user
    if user.update(share_status: params[:share_status])
      success_response({
        message: "Share status updated successfully.",
        share_status: user.share_status
      })
    else
      error_response(user.errors)
    end
  end

  # @oas_include
  # @tags Users
  # @summary Show a User
  # @response User found(200) [Hash{user: Hash{id: Integer, email: String, username: String, description: String, avatar_url: String share_status: Boolean, following_count: Integer, followers_count: Integer, following: Boolean}}]
  # @response User not found(404) [Hash{error: String}]
  def show
    user = User.find_by(id: params[:id])
    return user_not_found_response unless user

    serialized_user = UserSerializer.detailed(user, current_user: Current.user)
    success_response({ user: serialized_user })
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
    base_url = ENV["FRONTEND_URL"].presence || "http://localhost:5173"
    login_url = "#{base_url}/login"

    if params[:api].present?
      handle_api_confirmation(user)
    else
      handle_redirect_confirmation(user, login_url)
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
    unless params[:q].present?
      return bad_request_response("Query parameter 'q' is required.")
    end

    users_scope = User.find_by_username(params[:q])
    pagy, users = pagy(users_scope, items: params[:items] || 20)

    users_json = users.includes(avatar_attachment: :blob).map do |user|
      UserSerializer.basic(user)
    end

    success_response({
      users: users_json,
      page: pagy.page,
      pages: pagy.pages,
      count: pagy.count
    })
  end

  private

  def user_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end

  def handle_api_confirmation(user)
    if user&.confirmed?
      success_response({ message: "Account already confirmed." })
    elsif user
      user.confirm!
      success_response({ message: "Account confirmed. You can now sign in." })
    else
      not_found_response("Invalid or expired confirmation token.")
    end
  end

  def handle_redirect_confirmation(user, login_url)
    if user&.confirmed?
      redirect_to "#{login_url}?status=already_confirmed", allow_other_host: true
    elsif user
      user.confirm!
      redirect_to "#{login_url}?status=confirmed", allow_other_host: true
    else
      redirect_to "#{login_url}?status=invalid_token", allow_other_host: true
    end
  end
end
