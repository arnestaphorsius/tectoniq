// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import type { EntryMode } from '@/domain/input/notes'
import NumberPad from './NumberPad.vue'

enableAutoUnmount(afterEach)

function mountPad(mode: EntryMode = 'normal') {
  return mount(NumberPad, { props: { mode }, attachTo: document.body })
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

  it('marks the current mode, and only that one, as pressed', () => {
    const wrapper = mountPad('candidate')

    expect(wrapper.get('[data-mode="candidate"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-mode="normal"]').attributes('aria-pressed')).toBe('false')
  })

  it('switches mode from the toggle', async () => {
    const wrapper = mountPad()

    await wrapper.get('[data-mode="candidate"]').trigger('click')

    expect(wrapper.emitted('update:mode')).toEqual([['candidate']])
  })

  it('in Candidate mode, places its digits the way a cell draws candidates', () => {
    const places = (mode: EntryMode) =>
      mountPad(mode)
        .findAll('[data-digit] .face')
        .map((face) => face.attributes('data-note'))

    expect(places('normal')).toEqual([undefined, undefined, undefined, undefined, undefined])
    expect(places('candidate')).toEqual(['1', '2', '3', '4', '5'])
  })
})
