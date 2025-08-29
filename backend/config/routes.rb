Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  get "csrf", to: "application#csrf"

  # - `POST /v1/password_resets` → `create` (request password reset)
  # - `PATCH/PUT /v1/password_resets/:token` → `update` (reset password with token)
  # - `GET /v1/password_resets/:token/edit` → redirect to frontend edit page
  namespace :v1 do
    resources :password_resets, only: [ :create, :update ], param: :token do
      member do
        get :edit
      end
    end

    resource :registration, only: [ :create ] do
      collection do
        get :confirm
      end
    end

    resource :session, only: [ :create, :show, :destroy ]

    resources :users, only: [ :show ], param: :username do
      member do
        get :followers
        get :following
        put :follow
        put :unfollow
      end
    end

    resource :me, only: [ :show, :update ], controller: :me do
      collection do
        post :avatar
      end
    end

  end
end
