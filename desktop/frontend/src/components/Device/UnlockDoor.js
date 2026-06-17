"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LockOpen, X, ShieldCheck, Moon, Sun } from 'lucide-react';
import { checkPin } from '@/lib/api';
import { notify, parseApiError } from '@/lib/utils';

const PinEntryModal = ({ device_id, pinModal, setPinModal, onSuccess }) => {
    const { t } = useTranslation();
    const [pin, setPin] = useState([]);
    const pinLength = 4;

    const handleNumberClick = (num) => {
        if (pin.length < pinLength) {
            setPin([...pin, num]);
        }
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    const handleClear = () => {
        setPin([]);
    };

    const handleSubmit = async () => {
        if (pin.length === pinLength) {

            try {
                let { status } = await checkPin({ device_id, pin: pin.join('') });

                if (status) {
                    onSuccess(pin.join(''))
                    return;
                } else {
                    notify(t("accessControl.notify.errorTitle"), t("accessControl.pin.invalidPinSimple"), "error");
                }

            } catch (error) {
                console.log(error);
                notify(t("accessControl.notify.errorTitle"), parseApiError(error), "error");
            } finally {
                setPin([]);
            }
        }
    };

    return (
        <>
            {pinModal && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4"
                >
                    {/* Modal */}
                    <div className="relative z-20 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("accessControl.pin.enterPin")}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("accessControl.pin.deviceLabel", { id: device_id })}</p>
                            </div>
                            <button onClick={() => setPinModal(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* PIN Display */}
                        <div className="p-8">
                            <div className="flex justify-center gap-4 mb-10">
                                {[...Array(pinLength)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-14 h-14 flex items-center justify-center text-2xl font-bold rounded-full border-2 transition-all duration-200 
                  ${pin[i]
                                                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary'
                                                : 'border-gray-200 dark:border-gray-600 dark:bg-gray-700'
                                            }`}
                                    >
                                        {pin[i] ? '•' : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Keypad */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumberClick(num.toString())}
                                        className="h-16 flex items-center justify-center text-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors active:scale-95"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={handleBackspace}
                                    className="h-16 flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors active:scale-95"
                                >
                                    {t("accessControl.pin.backspace")}
                                </button>
                                <button
                                    onClick={() => handleNumberClick('0')}
                                    className="h-16 flex items-center justify-center text-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors active:scale-95"
                                >
                                    0
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="h-16 flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors text-sm font-bold tracking-wider active:scale-95"
                                >
                                    {t("accessControl.pin.clear")}
                                </button>
                            </div>

                            {/* Submit Action */}
                            <button
                                disabled={pin.length < pinLength}
                                onClick={handleSubmit}
                                className="w-full bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl  active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <LockOpen size={20} />
                                {t("accessControl.pin.unlockDoor")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PinEntryModal;