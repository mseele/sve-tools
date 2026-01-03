interface Window {
  google: typeof google & {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string
          callback: (response: { credential: string }) => void
          auto_select?: boolean
          cancel_on_tap_outside?: boolean
        }) => void
        renderButton: (
          element: HTMLElement | null,
          options: {
            theme: string
            size: string
            text: string
            shape: string
            width: number
          }
        ) => void
        disableAutoSelect: () => void
      }
    }
  }
}
