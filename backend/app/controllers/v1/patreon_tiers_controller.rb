class V1::PatreonTiersController < ApplicationController
  allow_unauthenticated_access

  def index
    patreon_tiers = PatreonTier.all
    render_success data: PatreonTierBlueprint.render_as_json(patreon_tiers)
  end

  def show
    patreon_tier = PatreonTier.find_by(id: params[:id])
    return render_error errors: "Patreon tier not found." unless patreon_tier

    render_success data: PatreonTierBlueprint.render_as_json(patreon_tier)
  end
end
