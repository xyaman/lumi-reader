require "image_processing/mini_magick"

class V1::MeController < ApplicationController
  before_action :check_file_size, only: [ :avatar ]

  # This function is always called when the frontend loads, make sense
  # to update user status here
  def show
    render_success data: UserBlueprint.render_as_json(Current.user, view: :login)
  end

  def update
    if Current.user.update(user_update_params)
      render_success data: UserBlueprint.render_as_json(Current.user, view: :show)
    else
      render_error errors: Current.user.errors.full_messages
    end
  end

  def avatar
    unless params[:avatar].present?
      return render_error errors: "Missing avatar file."
    end

    avatar_file = params[:avatar]
    user_plan = Current.user.patreon_tier&.name

    # Allowed MIME types
    basic_types = [ "image/jpeg", "image/png", "image/webp" ]
    tier_types  = [ "image/gif" ]

    allowed_types = basic_types.dup
    allowed_types.concat(tier_types) if user_plan == "Supporter"

    unless allowed_types.include?(avatar_file.content_type)
      return render_error errors: "File type not allowed. Please upload a JPEG, PNG, or WEBP. Patreon supporters can also upload GIFs."
    end

    begin
      extension = File.extname(avatar_file.original_filename)
      processed_image = ImageProcessing::MiniMagick
        .source(params[:avatar])
        .resize_to_fill(500, 500)
        .call

      secure_filename = "#{SecureRandom.uuid}#{extension}"
      Current.user.avatar.purge if Current.user.avatar.attached?

      Current.user.avatar.attach(
        io: processed_image,
        filename: secure_filename,
        content_type: avatar_file.content_type
      )

      # generate random filename
      secure_filename = "#{SecureRandom.uuid}#{extension}"
    rescue
      return render_error errors: "Invalid or corrupted image file."
    ensure
      processed_image&.close!
    end

    if Current.user.avatar.attached?
      avatar_url = url_for(Current.user.avatar)
      render_success data: avatar_url, message: "Avatar updated successfully."
    else
      render_error errors: "Avatar upload failed"
    end
  end

  def presence
    return render_error errors: "Invalid presence update parameters." unless params[:presence]

    status = params[:presence][:status]
    activity_type = params[:presence][:activity_type]
    activity_name = params[:presence][:activity_name]

    if status == "online"
      Current.user.set_online!
      render_success message: "User set to online."
    elsif status == "offline"
      Current.user.set_offline!
      render_success message: "User set to offline."
    elsif activity_type.present? && activity_name.present?
      Current.user.set_presence_activity!(type: activity_type, name: activity_name)
      render_success message: "User activity updated."
    else
      render_error errors: "Invalid presence update parameters."
    end
  end

  private

  def user_update_params
    params.expect(user: [ :bio, :share_online_status, :share_presence, :share_reading_sessions ])
  end

  def check_file_size
    return true if Current.user&.is_admin?

    content_length = request.headers["Content-Length"].to_i
    if content_length > 3.megabytes
      render_error errors: "Request size cannot exceed 3MB.", status: :payload_too_large
      return false
    end

    true
  end
end
