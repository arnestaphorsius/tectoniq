// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import NumberPad from './NumberPad.vue'

enableAutoUnmount(afterEach)

function mountPad() {
  return mount(NumberPad, { attachTo: document.body })
}

describe('number pad', () => {
  it('offers the digits 1..5 and Erase', () => {
    const wrapper = mountPad()

    const keys = wrapper.findAll('[data-digit]').map((key) => key.text())
    expect(keys).toEqual(['1', '2', '3', '4', '5'])
    expect(wrapper.get('[data-testid="pad-erase"]').attributes('aria-label')).toBe('Erase')
  })

  it('emits the digit pressed', async () => {
    const wrapper = mountPad()

    await wrapper.get('[data-digit="4"]').trigger('click')

    expect(wrapper.emitted('digit')).toEqual([[4]])
  })

  it('emits erase', async () => {
    const wrapper = mountPad()

    await wrapper.get('[data-testid="pad-erase"]').trigger('click')

    expect(wrapper.emitted('erase')).toEqual([[]])
  })

  it('is a labelled group', () => {
    const pad = mountPad().get('[data-testid="number-pad"]')

    expect(pad.attributes('role')).toBe('group')
    expect(pad.attributes('aria-label')).toBe('Number pad')
  })
})
