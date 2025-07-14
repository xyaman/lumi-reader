Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
  get "csrf", to: "application#csrf"

  namespace :v1 do
    resources :reading_sessions do
      collection do
        get "metadata", to: "reading_sessions#metadata"
      end
    end

    resource :session, only: [ :create, :show, :destroy ] do
      resources :follows, only: [ :update, :destroy ]

      patch "avatar", to: "users#update_avatar"
      patch "description", to: "users#update_description"
      patch "presence", to: "user_presence#update"
      patch "share_status", to: "users#update_share_status"
    end

    # email confirmation
    get "users_confirm", to: "users#confirm"
    get "users/search", to: "users#search"

    resources :users, only: [ :create, :show ] do
      resource :presence, only: [ :show ], controller: "user_presence"
      get "following", to: "follows#following"
      get "followers", to: "follows#followers"
    end

    get "user_presence/batch", to: "user_presence#batch"
  end

  if Rails.env.development?
    mount OasRails::Engine => "/api-docs"
  end
end
