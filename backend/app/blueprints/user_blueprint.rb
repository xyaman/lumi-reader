# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :username, :avatar_url

  view :show do
    fields :bio, :share_online_status, :share_presence, :following_count, :followers_count
    association :patreon_tier, name: :tier, blueprint: PatreonTierBlueprint, view: :light

    field :presence, if: ->(_field_name, user, _options) { user.share_presence }
  end

  view :login do
    include_view :show
    fields :email
    field :patreon_linked?, name: :is_patreon_linked
  end

  view :presence do
    field :presence, if: ->(_field_name, user, _options) { user.share_presence }
  end
end
