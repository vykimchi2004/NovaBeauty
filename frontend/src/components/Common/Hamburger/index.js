import React from 'react';
import classNames from 'classnames';
import styles from './Hamburger.module.scss';

function Hamburger({ open = false, setOpen = () => {}, className = '', ariaLabel = 'Toggle menu' }) {
  const btnClass = classNames(className, styles.hamburger, { [styles.open]: open });

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
