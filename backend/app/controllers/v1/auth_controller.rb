class V1::AuthController < ApplicationController
  allow_unauthenticated_access only: [ :patreon ]

  BASE_URL = ENV["FRONTEND_URL"].presence || "http://localhost:5173"
  REDIRECT_URI = "#{BASE_URL}/settings/account"

  def patreon
    session_id = params[:state]
    session = Session.find_by(id: session_id)
    unless session
      return redirect_to "#{REDIRECT_URI}?patreon_status=error", allow_other_host: true
    end

    user = session.user
    code = params[:code]

    unless code
      return redirect_to "#{REDIRECT_URI}?patreon_status=error", allow_other_host: true
    end

    patreon = PatreonService.new(user)
    patreon.authenticate_and_store(code)

    redirect_to "#{REDIRECT_URI}?patreon_status=success", allow_other_host: true

  rescue PatreonService::PatreonApiError => e
    Rails.logger.error("Patreon API error: #{e.message}")
    redirect_to "#{REDIRECT_URI}?patreon_status=error", allow_other_host: true
  end

  def refresh_patreon
    patreon = PatreonService.new(Current.user)
    patreon.update_and_store

    render_success

  rescue PatreonService::PatreonApiError => e
    Rails.logger.error("Patreon API error: #{e.message}")
    redirect_to "#{REDIRECT_URI}?patreon_status=error", allow_other_host: true
  end

  def unlink_patreon
    Current.user.unlink_patreon!
    render_success message: "Unlinked successfully!"
  end


  def generate_patreon_url
    session = Current.session
    render_success data: PatreonService.authorization_url(session.id)

  rescue PatreonService::PatreonApiError => e
    render_error errors: e.message
  end
end
