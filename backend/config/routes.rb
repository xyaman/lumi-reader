Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  get "csrf" => "app", to: "application#csrf"

  namespace :v1 do
    resource :session, only: [ :create, :show, :destroy ]

    resources :users, only: [ :create, :show ] do
      resources :follows, only: [ :create, :destroy ]
      get "following", to: "follows#following"
      get "followers", to: "follows#followers"
    end
  end

  namespace :v0 do
    get "me", to: "auth#me"
    get "search", to: "auth#search"
    post "register", to: "auth#register"
    post "login", to: "auth#login"
    put "update", to: "auth#update_share"

    post "user_status", to: "user_status#create"
    get "user_status", to: "user_status#retrieve"
    get "user_status/batch", to: "user_status#batch"
  end

  if Rails.env.development?
    mount OasRails::Engine => "/api-docs"
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
