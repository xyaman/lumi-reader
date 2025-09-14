class Rack::Attack
  throttle("password_reset/ip", limit: 2, period: 15.minutes) do |req|
    if req.path == "/v1/password_resets" && req.post?
      req.ip
    end
  end

  self.throttled_responder = lambda do |env|
    [ 429, { "Content-Type" => "application/json" }, [ { status: "error", errors: [ "Too many requests. Please try again later." ] }.to_json ] ]
  end

  throttle("registration/ip", limit: 4, period: 10.minutes) do |req|
    if req.path == "/v1/registration" && req.post?
      req.ip
    end
  end

  self.throttled_responder = lambda do |env|
    [ 429, { "Content-Type" => "application/json" }, [ { status: "error", errors: [ "Too many requests. Please try again later." ] }.to_json ] ]
  end

  throttle("session/ip", limit: 4, period: 10.minutes) do |req|
    if req.path == "/v1/session" && req.post?
      req.ip
    end
  end

  self.throttled_responder = lambda do |env|
    [ 429, { "Content-Type" => "application/json" }, [ { status: "error", errors: [ "Too many requests. Please try again later." ] }.to_json ] ]
  end
end
