class V1::MeController < ApplicationController
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

  # TODO: verificar que es una imagen
  def avatar
    unless params[:avatar].present?
      return render_error errors: "Missing avatar file."
    end

    if params[:avatar].size > 2.megabytes
      return render_error errors: "Avatar is too big (max 2MB)."
    end

    if Current.user.avatar.attached?
      Current.user.avatar.purge
    end

    Current.user.avatar.attach(params[:avatar])
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
    params.expect(user: [ :bio, :share_online_status, :share_presence ])
  end
end
