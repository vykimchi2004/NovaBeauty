import React from 'react';
import classNames from 'classnames/bind';
import styles from './SearchAndSort.module.scss';

const cx = classNames.bind(styles);

/**
 * Component tìm kiếm và sắp xếp/lọc dữ liệu
 * 
 * @param {string} searchPlaceholder - Placeholder cho ô tìm kiếm
 * @param {string} searchValue - Giá trị tìm kiếm hiện tại
 * @param {function} onSearchChange - Callback khi thay đổi giá trị tìm kiếm
 * @param {function} onSearchClick - Callback khi click nút tìm kiếm
 * @param {string} dateFilter - Giá trị filter theo ngày (tùy chọn, format: YYYY-MM-DD)
 * @param {function} onDateChange - Callback khi thay đổi filter ngày (tùy chọn)
 * @param {string} dateLabel - Label cho ô filter ngày (mặc định: "Ngày")
 * @param {string} sortLabel - Label cho dropdown sắp xếp (tương thích ngược, tùy chọn)
 * @param {Array} sortOptions - Mảng options cho dropdown sắp xếp (tương thích ngược, tùy chọn)
 * @param {string} sortValue - Giá trị sắp xếp hiện tại (tương thích ngược, tùy chọn)
 * @param {function} onSortChange - Callback khi thay đổi sắp xếp (tương thích ngược, tùy chọn)
 * @param {Array} filters - Mảng các filter dropdowns tùy chỉnh. Mỗi filter có:
 *   - label: string (optional) - Label hiển thị trước dropdown
 *   - options: Array - Mảng {value, label} cho các options
 *   - value: string - Giá trị hiện tại
 *   - onChange: function - Callback khi thay đổi
 * @param {Array} additionalButtons - Mảng các nút bổ sung. Mỗi button có:
 *   - text: string - Text hiển thị
 *   - className: string - CSS class
 *   - onClick: function - Callback khi click
 */
function SearchAndSort({
    searchPlaceholder = "Tìm kiếm...",
    searchValue,
    onSearchChange,
    onSearchClick,
    dateFilter,
    onDateChange,
    dateLabel = "Ngày",
    sortLabel = "Sắp xếp:",
    sortOptions = [],
    sortValue,
    onSortChange,
    filters = [],
    additionalButtons = []
}) {
    return (
        <div className={cx('search-sort-container')}>
            <div className={cx('search-section')}>
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    className={cx('search-input')}
                    value={searchValue}
                    onChange={onSearchChange}
                />
                {onDateChange && (
                    <div className={cx('date-input-wrapper')}>
                        <label className={cx('date-label')}>{dateLabel}</label>
                        <input
                            type="date"
                            className={cx('date-input')}
                            value={dateFilter || ''}
                            onChange={(e) => onDateChange(e.target.value)}
                        />
                    </div>
                )}
                <button className={cx('search-btn')} onClick={onSearchClick}>
                    Tìm kiếm
                </button>
            </div>

            {/* Hiển thị sort dropdown cũ (tương thích ngược) nếu có sortOptions */}
            {sortOptions.length > 0 && (
                <div className={cx('sort-section')}>
                    {sortLabel && <span className={cx('sort-label')}>{sortLabel}</span>}
                    <select className={cx('sort-dropdown')} value={sortValue} onChange={onSortChange}>
                        {sortOptions.map((option, index) => (
                            <option key={index} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Hiển thị các filter dropdowns tùy chỉnh */}
            {filters.map((filter, index) => (
                <div key={index} className={cx('sort-section')}>
                    {filter.label && <span className={cx('sort-label')}>{filter.label}</span>}
                    <select
                        className={cx('sort-dropdown')}
                        value={filter.value}
                        onChange={filter.onChange}
                    >
                        {filter.options.map((option, optIndex) => (
                            <option key={optIndex} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            {additionalButtons.map((button, index) => (
                <button
                    key={index}
                    className={cx('btn', button.className)}
                    onClick={button.onClick}
                >
                    {button.text}
                </button>
            ))}
        </div>
    );
}

export default SearchAndSort;

