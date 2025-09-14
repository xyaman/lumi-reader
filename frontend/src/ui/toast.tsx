import toast from "solid-toast"

export const infoToast = (msg: string) =>
    toast(msg, {
        duration: 2000,
        position: "bottom-right",
        style: {
            background: "var(--base02)",
            color: "var(--base05)",
        },
    })

export const errorToast = (msg: string) =>
    toast.error(msg, {
        duration: 4000,
        position: "bottom-right",
        style: {
            background: "var(--base02)",
            color: "var(--base05)",
        },
    })
