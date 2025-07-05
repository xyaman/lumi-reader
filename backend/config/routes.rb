Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
  get "csrf", to: "application#csrf"

  namespace :v1 do
    resource :session, only: [ :create, :show, :destroy ] do
      # note (oas-rails bug): if I don't add the controller name, oas-rails can't find the route
      resource :user_status, only: [ :update ], controller: "user_status"

      patch "avatar", to: "users#update_avatar"
    end

    # email confirmation
    get "users_confirm", to: "users#confirm"

    resources :users, only: [ :create, :show ] do
      resource :status, only: [ :show ], controller: "user_status"
      resources :follows, only: [ :create, :destroy ]
      get "following", to: "follows#following"
      get "followers", to: "follows#followers"
    end

    get "user_status/batch", to: "user_status#batch"
  end

  if Rails.env.development?
    mount OasRails::Engine => "/api-docs"
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
