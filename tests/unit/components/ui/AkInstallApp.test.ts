import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkInstallApp from '../../../../app/components/ui/AkInstallApp.vue'

describe('AkInstallApp', () => {
  it('renders nothing when the browser has no PWA install prompt', async () => {
    const wrapper = await mountSuspended(AkInstallApp)
    expect(wrapper.find('.ak-install-app').exists()).toBe(false)
  })
})
