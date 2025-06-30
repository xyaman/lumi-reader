Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
  get "current_user", to: "application#current_user"

  get "/follow/:id", to: "follows#following"
  get "/followers/:id", to: "follows#followers"
  post "/follow/:id", to: "follows#create"

  namespace :api do
    namespace :v1 do
      get "search", to: "auth#search"
      post "register", to: "auth#register"
      post "login", to: "auth#login"
      delete "logout", to: "auth#logout"
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
