# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :username, :avatar_url

  view :show do
    fields :bio, :share_online_status, :share_presence, :following_count, :followers_count
    association :patreon_tier, blueprint: PatreonTierBlueprint, view: :light
  end

  view :login do
    include_view :show
    fields :email
  end

  view :presence do
    fields :presence
  end
end
