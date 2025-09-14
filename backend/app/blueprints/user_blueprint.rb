# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :username, :avatar_url

  view :presence do
    field :presence, if: ->(_field_name, user, _options) { user.share_presence }
  end

  view :show do
    include_view :presence
    fields :bio, :share_online_status, :share_presence, :share_reading_sessions, :following_count, :followers_count
    association :patreon_tier, name: :tier, blueprint: PatreonTierBlueprint, view: :light

    field :presence, if: ->(_field_name, user, _options) { user.share_presence }

    field :stats do |user, _options|
      ReadingSession.stats_for(user)
    end

    field :is_following do |_user, options|
      options[:is_following] || nil
    end
  end

  view :login do
    include_view :show
    fields :email
    field :patreon_linked?, name: :is_patreon_linked
  end
end
