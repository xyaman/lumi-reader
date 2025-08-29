require "net/http"
require "json"


# https://docs.patreon.com/#oauth
class PatreonService
  PATREON_API_BASE = "https://www.patreon.com/api/oauth2/v2"

  # https://www.patreon.com/api/oauth2/v2/campaigns
  # with your own creator token
  CAMPAIGN_ID = ENV["PATREON_CAMPAIGN_ID"]
  CREATOR_ACCESS_TOKEN = ENV["PATREON_CREATOR_ACCESS_TOKEN"]
  CLIENT_ID = ENV["PATREON_CLIENT_ID"]
  CLIENT_SECRET = ENV["PATREON_CLIENT_SECRET"]
  REDIRECT_URI  = ENV["REDIRECT_URI"]

  # --- Class Methods ---
  def self.authorization_url
    scopes = [ "identity", "identity[memberships]" ].join(" ")
    uri = URI("https://www.patreon.com/oauth2/authorize")
    uri.query = URI.encode_www_form({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: scopes
    })
    uri.to_s
  end

  def self.fetch_tiers
    uri = URI(
      "#{PATREON_API_BASE}/campaigns/#{CAMPAIGN_ID}" \
      "?include=tiers" \
      "&fields[tier]=title,amount_cents,description,published,patron_count,created_at,image_url"
    )
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{CREATOR_ACCESS_TOKEN}"
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    # raise "Patreon API error: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)
    data = JSON.parse(res.body)
    data
  end

  def initialize(user)
    @user = user
  end

  def authenticate_and_store(code)
    tokens = get_tokens(code)
    identity_data = fetch_identity_and_memberships(tokens)
    set_patreon_fields!(tokens, identity_data)
  end


  def fetch_identity_and_memberships(tokens)
    uri = URI("#{PATREON_API_BASE}/identity?include=memberships.currently_entitled_tiers&fields%5Btier%5D=title")
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{tokens["access_token"]}"
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    data = JSON.parse(res.body)

    # TODO: sync_from_api(data)
    data
  end

  # def ensure_token!
  #   if @user.patreon_expires_at.nil? || @user.patreon_expires_at < 2.minutes.from_now
  #     tokens = refresh_token(@user.patreon_refresh_token, REDIRECT_URI)
  #     set_patreon_fields!(tokens)
  #   end
  # end

  private

  # https://docs.patreon.com/#step-4-validating-receipt-of-the-oauth-token
  def get_tokens(code)
    update_token({
      grant_type: "authorization_code",
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI
    })
  end


  # https://docs.patreon.com/?shell#step-7-keeping-up-to-date
  def refresh_token(refresh_token, redirect_uri)
    update_token({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  end

  def update_token(params)
    uri = URI("https://www.patreon.com/api/oauth2/token")
    res = Net::HTTP.post_form(uri, params)
    body = JSON.parse(res.body)
    body
  end

  def set_patreon_fields!(tokens)
    expiry_date = Time.current + tokens["expires_in"].to_i.seconds
    @user.update!(
      patreon_access_token: tokens["access_token"],
      patreon_refresh_token: tokens["refresh_token"],
      patreon_expires_at: expiry_date
    )
  end
end
