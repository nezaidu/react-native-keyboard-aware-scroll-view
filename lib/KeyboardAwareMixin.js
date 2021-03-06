/* @flow */

import { PropTypes } from 'react'
import ReactNative, { TextInput, Keyboard, UIManager, Platform} from 'react-native'
import TimerMixin from 'react-timer-mixin'

const _KAM_DEFAULT_TAB_BAR_HEIGHT: number = 49
const _KAM_KEYBOARD_OPENING_TIME: number = 250
const _KAM_EXTRA_HEIGHT: number = 75

const isAndroid = () => Platform.OS === 'android'

const KeyboardAwareMixin = {
  mixins: [TimerMixin],
  propTypes: {
    enableAutoAutomaticScroll: PropTypes.bool,
    extraHeight: PropTypes.number,
    keyboardOpeningTime: PropTypes.number,
    extraScrollHeight: PropTypes.number,
  },

  getDefaultProps: function () {
    return {
      enableAutoAutomaticScroll: true,
      extraHeight: _KAM_EXTRA_HEIGHT,
      keyboardOpeningTime: _KAM_KEYBOARD_OPENING_TIME,
      extraScrollHeight: 0,
    }
  },

  setViewIsInsideTabBar: function (viewIsInsideTabBar: bool) {
    this.viewIsInsideTabBar = viewIsInsideTabBar
    this.setState({keyboardSpace: _KAM_DEFAULT_TAB_BAR_HEIGHT})
  },

  setResetScrollToCoords: function (coords: {x: number, y: number}) {
    this.resetCoords = coords
  },

  getInitialState: function (props: Object) {
    this.viewIsInsideTabBar = false
    this.keyboardWillShowEvent = undefined
    this.keyboardWillHideEvent = undefined
    return {
      keyboardSpace: 0,
    }
  },

  // Keyboard actions
  updateKeyboardSpace: function (frames: Object) {
    let keyboardSpace: number = frames.endCoordinates.height + this.props.extraScrollHeight
    if (this.props.viewIsInsideTabBar) {
      keyboardSpace -= _KAM_DEFAULT_TAB_BAR_HEIGHT
    }
    this.setState({keyboardSpace})
    // Automatically scroll to focused TextInput
    if (this.props.enableAutoAutomaticScroll) {
      const currentlyFocusedField = TextInput.State.currentlyFocusedField()
      if (!currentlyFocusedField) {
        return
      }
      UIManager.viewIsDescendantOf(
        currentlyFocusedField,
        this.getScrollResponder().getInnerViewNode(),
        (isAncestor) => {
          if (isAncestor) {
            // Check if the TextInput will be hidden by the keyboard
            UIManager.measureInWindow(currentlyFocusedField, (x, y, width, height) => {
              if (y + height > frames.endCoordinates.screenY - this.props.extraScrollHeight - this.props.extraHeight) {
                this.scrollToFocusedInputWithNodeHandle(currentlyFocusedField)
              }
            })
          }
        }
      )
    }
    if (!this.resetCoords) {
      this.defaultResetScrollToCoords = this.position
    }
  },

  resetKeyboardSpace: function () {
    const keyboardSpace: number = (this.props.viewIsInsideTabBar) ? _KAM_DEFAULT_TAB_BAR_HEIGHT + this.props.extraScrollHeight : this.props.extraScrollHeight
    this.setState({keyboardSpace})
    // Reset scroll position after keyboard dismissal
    if (this.resetCoords) {
      this.scrollToPosition(this.resetCoords.x, this.resetCoords.y, true)
    } else {
      this.scrollToPosition(this.defaultResetScrollToCoords.x, this.defaultResetScrollToCoords.y, true)
    }
  },

  componentDidMount: function () {
    // Keyboard events
    const events = {
      show: isAndroid() ? 'keyboardDidShow' : 'keyboardWillShow',
      hide: isAndroid() ? 'keyboardDidHide' : 'keyboardWillHide',
    }
    this.keyboardWillShowEvent = Keyboard.addListener(events.show, this.updateKeyboardSpace)
    this.keyboardWillHideEvent = Keyboard.addListener(events.hide, this.resetKeyboardSpace)
  },

  componentWillUnmount: function () {
    this.keyboardWillShowEvent && this.keyboardWillShowEvent.remove()
    this.keyboardWillHideEvent && this.keyboardWillHideEvent.remove()
  },

  scrollToPosition: function (x: number, y: number, animated: bool = false) {
    const scrollView = this.refs._rnkasv_keyboardView.getScrollResponder()
    scrollView.scrollResponderScrollTo({x: x, y: y, animated: animated})
  },

  /**
   * @param keyboardOpeningTime: takes a different keyboardOpeningTime in consideration.
   * @param extraHeight: takes an extra height in consideration.
   */
  scrollToFocusedInput: function (reactNode: Object, keyboardOpeningTime: number = this.props.keyboardOpeningTime, extraHeight: number = this.props.extraHeight) {
    // Android already does this
    if(isAndroid()) return;

    const scrollView = this.refs._rnkasv_keyboardView.getScrollResponder()
    this.setTimeout(() => {
      scrollView.scrollResponderScrollNativeHandleToKeyboard(
        reactNode, extraHeight, true
      )
    }, keyboardOpeningTime)
  },

  scrollToFocusedInputWithNodeHandle: function (nodeID: number, keyboardOpeningTime: number = this.props.keyboardOpeningTime, extraHeight: number = this.props.extraHeight) {
    const reactNode = ReactNative.findNodeHandle(nodeID)
    this.scrollToFocusedInput(reactNode, keyboardOpeningTime, extraHeight)
  },

  position: {x: 0, y: 0},

  defaultResetScrollToCoords: {x: 0, y: 0},

  handleOnScroll: function (e) {
    this.position = e.nativeEvent.contentOffset
  },
}

export default KeyboardAwareMixin