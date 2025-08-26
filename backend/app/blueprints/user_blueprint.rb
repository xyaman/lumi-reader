# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :username, :bio, :share_online_status, :share_presence, :following_count, :followers_count
  field :user_plan do |user, _options|
    user.user_plan.name
  end

  view :login do
    include_view :default
    fields :email
  end
end
