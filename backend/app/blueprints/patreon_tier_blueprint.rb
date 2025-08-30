# frozen_string_literal: true

class PatreonTierBlueprint < Blueprinter::Base
  identifier :id

  fields :patreon_tier_id, :name, :description, :amount_cents, :published, :image_url, :book_sync_limit

  view :light do
    fields :name, :book_sync_limit
  end
end
