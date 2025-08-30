class V1::Webhooks::PatreonWebhooksController < ApplicationController
  allow_unauthenticated_access

  def create
    payload = request.body.read
    data = JSON.parse(payload) rescue nil

    if data.nil?
      render json: { error: "Invalid payload" }, status: :bad_request
      return
    end

    # Example: Patreon sends membership events
    event_type = request.headers["X-Patreon-Event"] # e.g. "members:pledge:create"
    Rails.logger.info("Patreon Webhook: #{event_type}")
    Rails.logger.debug(data)

    case event_type
    when "members:pledge:create", "members:pledge:update"
      handle_membership_update(data)
    when "members:pledge:delete"
      handle_membership_delete(data)
    else
      Rails.logger.warn("Unhandled Patreon event: #{event_type}")
    end

    head :ok
  end

  private

  def handle_membership_update(data)
    member = data.dig("data")
    patreon_id = member.dig("relationships", "user", "data", "id")
    tier_id = member.dig("relationships", "currently_entitled_tiers", "data", 0, "id")

    puts "Tier ID: #{tier_id}"
    tier = PatreonTier.find_by(patreon_tier_id: tier_id)
    puts "Tier: #{tier}"

    puts "User Patreon ID: #{patreon_id}"

    user = User.find_by(patreon_id: patreon_id)
    return unless user

    if tier_id
      tier = PatreonTier.find_by(patreon_tier_id: tier_id)
      # TODO: what happens if tier is nil? how to handle
      user.update!(patreon_tier: tier)
    else
      user.update!(patreon_tier: PatreonTier.find_by(name: "Free"))
    end
  end

  def handle_membership_delete(data)
    patreon_id = data.dig("data", "id")
    user = User.find_by(patreon_id: patreon_id)
    user&.unlink_patreon!
  end
end
