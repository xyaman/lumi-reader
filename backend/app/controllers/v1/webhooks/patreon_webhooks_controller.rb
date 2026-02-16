class V1::Webhooks::PatreonWebhooksController < ApplicationController
  allow_unauthenticated_access

  def create
    payload = request.body.read
    signature = request.headers["X-Patreon-Signature"]

    unless PatreonService.valid_webhook_signature?(payload, signature)
      Rails.logger.warn("Invalid Patreon webhook signature")
      return render json: { error: "Invalid signature" }, status: :unauthorized
    end

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

    user = User.find_by(patreon_id: patreon_id)
    return unless user

    tier = PatreonTier.find_by(patreon_tier_id: tier_id) if tier_id

    if tier.nil?
      Rails.logger.warn("Unknown Patreon tier: #{tier_id}, defaulting to Free")
      tier = PatreonTier.find_by(name: "Free")
    end

    user.update!(patreon_tier: tier)
  end

  def handle_membership_delete(data)
    patreon_id = data.dig("data", "id")
    user = User.find_by(patreon_id: patreon_id)
    user&.unlink_patreon!
  end
end
