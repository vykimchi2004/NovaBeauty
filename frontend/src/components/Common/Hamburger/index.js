import React from 'react';
import classNames from 'classnames/bind';
import styles from './Hamburger.module.scss';

function Hamburger({ open = false, setOpen = () => {}, className = '', ariaLabel = 'Toggle menu' }) {
  const cx = classNames.bind(styles);
  const btnClass = cx('hamburger', { open }, className);

  return (
    <button
      type="button"
      className={btnClass}
      aria-label={ariaLabel}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
export default Hamburger;
