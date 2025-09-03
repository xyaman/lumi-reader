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

    get "auth/patreon/callback", to: "auth#patreon"
    get "auth/patreon/unlink", to: "auth#unlink_patreon"
    get "auth/patreon/refresh", to: "auth#refresh_patreon"
    get "auth/patreon/generate", to: "auth#generate_patreon_url"

    namespace :webhooks do
      post :patreon, to: "patreon_webhooks#create"
    end

    resources :users, only: [ :index, :show ], param: :username do
      member do
        get :followers
        get :following
        put :follow
        put :unfollow
        get :recent_reading_sessions
      end
    end

    resource :me, only: [ :show, :update ], controller: :me do
      collection do
        put :avatar
        put :presence
      end
    end

    resources :reading_sessions, only: [ :create, :show, :update, :destroy, :index ], param: :snowflake do
      collection do
        put :batch_update
      end
    end

    resources :patreon_tiers, only: [ :index, :show ]

    resources :user_books, only: [ :index, :create, :update, :destroy ], param: :unique_id do
      collection do
        put :sync
      end
    end
  end
end
