import { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faPlus } from '@fortawesome/free-solid-svg-icons';
import styles from './AddressListModal.module.scss';
import { getMyAddresses, createAddress } from '~/services/address';
import { formatFullAddress, normalizeAddressPayload } from './useGhnLocations';
import { useAddress } from '~/hooks/useAddress';
import { useNotification } from '~/components/Common/Notification';

const cx = classNames.bind(styles);

export default function AddressListModal({ open, onClose, onSelect }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const { success: showSuccess, error: showError } = useNotification();

    const {
        fullName,
        setFullName,
        phone,
        setPhone,
        detailAddress,
        setDetailAddress,
        provinces,
        districts,
        wards,
        selectedProvinceId,
        selectedDistrictId,
        selectedWardCode,
        selectedProvinceName,
        selectedDistrictName,
        selectedWardName,
        ghnAvailable,
        loadProvinces,
        handleSelectProvince,
        handleSelectDistrict,
        setSelectedWardCode: setWardCode,
        resetForm,
    } = useAddress({ autoLoadAddresses: false });

    useEffect(() => {
        if (!open) {
            setShowAddForm(false);
            return;
        }

        const loadAddresses = async () => {
            try {
                setLoading(true);
                const data = await getMyAddresses();
                setAddresses(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error loading addresses:', error);
                setAddresses([]);
            } finally {
                setLoading(false);
            }
        };

        loadAddresses();
    }, [open]);

    useEffect(() => {
        if (showAddForm && ghnAvailable && provinces.length === 0) {
            loadProvinces();
        }
    }, [showAddForm, ghnAvailable, provinces.length, loadProvinces]);

    if (!open) return null;

    const handleSelect = (address) => {
        if (onSelect) {
            onSelect(address);
        }
        if (onClose) {
            onClose();
        }
    };

    const handleAddAddress = async () => {
        // Validation using manual fields
        if (!fullName.trim() || !phone.trim() || !detailAddress.trim() || !manualProvinceName.trim() || !manualDistrictName.trim() || !manualWardName.trim()) {
            showError('Vui lòng điền đầy đủ thông tin địa chỉ');
            return;
        }

        try {
            const addressData = normalizeAddressPayload({
                recipientName: fullName.trim(),
                recipientPhoneNumber: phone.trim(),
                provinceName: manualProvinceName.trim(),
                provinceID: '',
                districtName: manualDistrictName.trim(),
                districtID: '',
                wardName: manualWardName.trim(),
                wardCode: '',
                address: detailAddress.trim(),
                defaultAddress: addresses.length === 0, // Set as default if first address
            });

            const newAddress = await createAddress(addressData);
            showSuccess('Thêm địa chỉ thành công!');

            // Reload addresses
            const data = await getMyAddresses();
            setAddresses(Array.isArray(data) ? data : []);

            // Reset form
            resetForm();
            setShowAddForm(false);
        } catch (error) {
            console.error('Error adding address:', error);
            showError(error.message || 'Không thể thêm địa chỉ. Vui lòng thử lại.');
        }
    };

    return (
        <div className={cx('overlay')} onClick={onClose}>
            <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
                <div className={cx('header')}>
                    <h3>{showAddForm ? 'Thêm địa chỉ mới' : 'Chọn địa chỉ'}</h3>
                    <button type="button" className={cx('closeBtn')} onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className={cx('body')}>
                    {showAddForm ? (
                        <div className={cx('add-form')}>
                            <div className={cx('form-group')}>
                                <label>Họ và tên người nhận *</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Nhập họ và tên"
                                />
                            </div>

                            <div className={cx('form-group')}>
                                <label>Số điện thoại *</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>

                            <div className={cx('form-group')}>
                                <label>Tỉnh/Thành phố *</label>
                                <input
                                    type="text"
                                    value={manualProvinceName}
                                    onChange={(e) => setManualProvinceName(e.target.value)}
                                    placeholder="Nhập tỉnh/thành phố"
                                />
                            </div>

                            <div className={cx('form-group')}>
                                <label>Quận/Huyện *</label>
                                <input
                                    type="text"
                                    value={manualDistrictName}
                                    onChange={(e) => setManualDistrictName(e.target.value)}
                                    placeholder="Nhập quận/huyện"
                                />
                            </div>

                            <div className={cx('form-group')}>
                                <label>Phường/Xã *</label>
                                <input
                                    type="text"
                                    value={manualWardName}
                                    onChange={(e) => setManualWardName(e.target.value)}
                                    placeholder="Nhập phường/xã"
                                />
                            </div>

                            <div className={cx('form-group')}>
                                <label>Số nhà, tên đường *</label>
                                <input
                                    type="text"
                                    value={detailAddress}
                                    onChange={(e) => setDetailAddress(e.target.value)}
                                    placeholder="Nhập số nhà, tên đường"
                                />
                            </div>

                            <div className={cx('form-actions')}>
                                <button
                                    type="button"
                                    className={cx('btn', 'btn-secondary')}
                                    onClick={() => setShowAddForm(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className={cx('btn', 'btn-primary')}
                                    onClick={handleAddAddress}
                                >
                                    Thêm địa chỉ
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {loading ? (
                                <div className={cx('loading')}>Đang tải...</div>
                            ) : addresses.length === 0 ? (
                                <div className={cx('empty')}>Bạn chưa có địa chỉ nào. Vui lòng thêm địa chỉ mới.</div>
                            ) : (
                                <div className={cx('address-list')}>
                                    {addresses.map((address) => (
                                        <div
                                            key={address.addressId || address.id}
                                            className={cx('address-item')}
                                            onClick={() => handleSelect(address)}
                                        >
                                            <div className={cx('address-content')}>
                                                <div className={cx('address-header')}>
                                                    <span className={cx('recipient-name')}>{address.recipientName}</span>
                                                    {address.defaultAddress && (
                                                        <span className={cx('default-badge')}>Mặc định</span>
                                                    )}
                                                </div>
                                                <div className={cx('recipient-phone')}>{address.recipientPhoneNumber}</div>
                                                <div className={cx('address-text')}>{formatFullAddress(address)}</div>
                                            </div>
                                            <FontAwesomeIcon icon={faCheck} className={cx('check-icon')} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className={cx('footer-actions')}>
                                <button
                                    type="button"
                                    className={cx('btn', 'btn-add')}
                                    onClick={() => setShowAddForm(true)}
                                >
                                    <FontAwesomeIcon icon={faPlus} />
                                    Thêm địa chỉ mới
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

