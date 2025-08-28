# frozen_string_literal: true

class UserPlanBlueprint < Blueprinter::Base
  identifier :id
  field :name
  field :book_sync_limit
end
