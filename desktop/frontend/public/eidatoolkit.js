var LOG;
var service_context = 0;

/**
 * Secure is decalared for processing connection on secure layer or not --vishal
 */
var secure;

/**
 * ErrorCodes.
 * This object defines Toolkit error codes
 */
var ErrorCodes = {
    SERVICE_COMMUNICATION_ERROR: 301,
    SERVICE_BUSY: 302,
    INVALID_FIELD: 303,
};

/**
 * ExceptionType.
 * This object defines Toolkit error types
 */
var ExceptionType = {
    TOOLKIT_ERROR: "TOOLKIT_ERROR",
    CARD_PIN_ERROR: "CARD_PIN_ERROR",
};

/**
 * FingerIndexses
 * This object defines finger indexes
 *
 */
this.FINGER_INDEXS = {
    NONE: 0,
    NO_MEANING: 3,
    RIGHT_THUMB: 5,
    RIGHT_INDEX: 9,
    RIGHT_MIDDLE: 13,
    RIGHT_RING: 17,
    RIGHT_LITTLE: 21,
    LEFT_THUMB: 6,
    LEFT_INDEX: 10,
    LEFT_MIDDLE: 14,
    LEFT_RING: 18,
    LEFT_LITTLE: 22,
};

var services;

function ToolkitException(code, message, errorType, attemptsLeft) {
    this.code;
    this.message;
    this.errorType;
    this.attemptsLeft;
}

function ModifiablePublicData(xmlModifiableDataBody) {
    this.occupationCode = xmlModifiableDataBody.OccupationCode;
    this.occupationArabic = xmlModifiableDataBody.OccupationArabic;
    this.occupationEnglish = xmlModifiableDataBody.OccupationEnglish;
    this.familyID = xmlModifiableDataBody.FamilyId;
    this.occupationTypeArabic = xmlModifiableDataBody.OccupationTypeArabic;
    this.occupationTypeEnglish = xmlModifiableDataBody.OccupationTypeEnglish;
    this.occupationFieldCode = xmlModifiableDataBody.OccupationFieldCode;
    this.companyNameArabic = xmlModifiableDataBody.CompanyNameArabic;
    this.companyNameEnglish = xmlModifiableDataBody.CompanyNameEnglish;
    this.maritalStatusCode = xmlModifiableDataBody.MaritalStatusCode;
    this.husbandIdNumber = xmlModifiableDataBody.HusbandIdNumber;
    this.sponsorTypeCode = xmlModifiableDataBody.SponsorTypeCode;
    this.sponsorUnifiedNumber = xmlModifiableDataBody.SponsorUnifiedNumber;
    this.sponsorName = xmlModifiableDataBody.SponsorName;
    this.residencyTypeCode = xmlModifiableDataBody.ResidencyTypeCode;
    this.residencyNumber = xmlModifiableDataBody.ResidencyNumber;
    this.residencyExpiryDate = xmlModifiableDataBody.ResidencyExpiryDate;
    this.passportNumber = xmlModifiableDataBody.PassportNumber;
    this.passportTypeCode = xmlModifiableDataBody.PassportTypeCode;
    this.passportCountryCode = xmlModifiableDataBody.PassportCountryCode;
    this.passportCountryArabic = xmlModifiableDataBody.PassportCountryArabic;
    this.passportCountryEnglish = xmlModifiableDataBody.PassportCountryEnglish;
    this.passportIssueDate = xmlModifiableDataBody.PassportIssueDate;
    this.passportExpiryDate = xmlModifiableDataBody.PassportExpiryDate;
    this.qualificationLevelCode = xmlModifiableDataBody.QualificationLevelCode;
    this.qualificationLevelArabic = xmlModifiableDataBody.QualificationLevelArabic;
    this.qualificationLevelEnglish = xmlModifiableDataBody.QualificationLevelEnglish;
    this.degreeDescriptionArabic = xmlModifiableDataBody.DegreeDescriptionArabic;
    this.degreeDescriptionEnglish = xmlModifiableDataBody.DegreeDescriptionEnglish;
    this.fieldOfStudyArabic = xmlModifiableDataBody.FieldOfStudyArabic;
    this.fieldOfStudyEnglish = xmlModifiableDataBody.FieldOfStudyEnglish;
    this.fieldOfStudyCode = xmlModifiableDataBody.FieldOfStudyCode;
    this.placeOfStudyArabic = xmlModifiableDataBody.PlaceOfStudyArabic;
    this.placeOfStudyEnglish = xmlModifiableDataBody.PlaceOfStudyEnglish;
    this.dateOfGraduation = xmlModifiableDataBody.DateOfGraduation;
    this.motherFullNameArabic = xmlModifiableDataBody.MotherFullNameArabic;
    this.motherFullNameEnglish = xmlModifiableDataBody.MotherFullNameEnglish;
}

function NonModifiablePublicData(xmlNonModifiableDataBody) {
    this.iDType = xmlNonModifiableDataBody.IdType;
    this.gender = xmlNonModifiableDataBody.Gender;
    this.dateOfBirth = xmlNonModifiableDataBody.DateOfBirth;
    this.issueDate = xmlNonModifiableDataBody.IssueDate;
    this.expiryDate = xmlNonModifiableDataBody.ExpiryDate;
    this.titleArabic = xmlNonModifiableDataBody.TitleArabic;
    this.titleEnglish = xmlNonModifiableDataBody.TitleEnglish;
    this.fullNameArabic = xmlNonModifiableDataBody.FullNameArabic;
    this.fullNameEnglish = xmlNonModifiableDataBody.FullNameEnglish;
    this.nationalityArabic = xmlNonModifiableDataBody.NationalityArabic;
    this.nationalityEnglish = xmlNonModifiableDataBody.NationalityEnglish;
    this.nationalityCode = xmlNonModifiableDataBody.NationalityCode;
    this.placeOfBirthArabic = xmlNonModifiableDataBody.PlaceOfBirthArabic;
    this.placeOfBirthEnglish = xmlNonModifiableDataBody.PlaceOfBirthEnglish;
}

function HomeAddress(xmlHomeAddressBody) {
    if (!xmlHomeAddressBody) {
        return null;
    }
    this.addressTypeCode = xmlHomeAddressBody.AddressTypeCode;
    this.flatNo = xmlHomeAddressBody.FlatNo;
    this.buildingNameArabic = xmlHomeAddressBody.BuildingNameArabic;
    this.buildingNameEnglish = xmlHomeAddressBody.BuildingNameEnglish;
    this.streetArabic = xmlHomeAddressBody.StreetArabic;
    this.streetEnglish = xmlHomeAddressBody.StreetEnglish;
    this.locationCode = xmlHomeAddressBody.LocationCode;
    this.areaCode = xmlHomeAddressBody.AreaCode;
    this.areaDescArabic = xmlHomeAddressBody.AreaDescArabic;
    this.areaDescEnglish = xmlHomeAddressBody.AreaDescEnglish;
    this.emiratesCode = xmlHomeAddressBody.EmiratesCode;
    this.pOBOX = xmlHomeAddressBody.POBOX;
    this.cityCode = xmlHomeAddressBody.CityCode;
    this.cityDescArabic = xmlHomeAddressBody.CityDescArabic;
    this.cityDescEnglish = xmlHomeAddressBody.CityDescEnglish;
    this.emiratesDescArabic = xmlHomeAddressBody.EmiratesDescArabic;
    this.emiratesDescEnglish = xmlHomeAddressBody.EmiratesDescEnglish;
    this.email = xmlHomeAddressBody.Email;
    this.residentPhoneNumber = xmlHomeAddressBody.ResidentPhoneNumber;
    this.mobilePhoneNumber = xmlHomeAddressBody.MobilePhoneNumber;
}

function WorkAddress(xmlWorkAddressBody) {
    if (!xmlWorkAddressBody) {
        return null;
    }
    this.addressTypeCode = xmlWorkAddressBody.AddressTypeCode;
    this.locationCode = xmlWorkAddressBody.LocationCode;
    this.companyNameArabic = xmlWorkAddressBody.CompanyNameArabic;
    this.companyNameEnglish = xmlWorkAddressBody.CompanyNameEnglish;
    this.emiratesCode = xmlWorkAddressBody.EmiratesCode;
    this.emiratesDescArabic = xmlWorkAddressBody.EmiratesDescArabic;
    this.emiratesDescEnglish = xmlWorkAddressBody.EmiratesDescEnglish;
    this.cityCode = xmlWorkAddressBody.CityCode;
    this.cityDescArabic = xmlWorkAddressBody.CityDescArabic;
    this.cityDescEnglish = xmlWorkAddressBody.CityDescEnglish;
    this.pOBOX = xmlWorkAddressBody.POBOX;
    this.streetArabic = xmlWorkAddressBody.StreetArabic;
    this.streetEnglish = xmlWorkAddressBody.StreetEnglish;
    this.areaCode = xmlWorkAddressBody.AreaCode;
    this.areaDescArabic = xmlWorkAddressBody.AreaDescArabic;
    this.areaDescEnglish = xmlWorkAddressBody.AreaDescEnglish;
    this.buildingNameArabic = xmlWorkAddressBody.BuildingNameArabic;
    this.buildingNameEnglish = xmlWorkAddressBody.BuildingNameEnglish;
    this.landPhoneNumber = xmlWorkAddressBody.LandPhoneNumber;
    this.mobilePhoneNumber = xmlWorkAddressBody.MobilePhoneNumber;
    this.email = xmlWorkAddressBody.Email;
}

function Wife(wifeData) {
    this.wifeIDN = wifeData.WifeIdNumber;
    this.fullNameArabic = wifeData.FullNameArabic;
    this.fullNameEnglish = wifeData.FullNameEnglish;
    this.nationalityCode = wifeData.NationalityCode;
    this.nationalityArabic = wifeData.NationalityArabic;
    this.nationalityEnglish = wifeData.NationalityEnglish;
}

function Resource(resourceData) {
    this.ResourceType = resourceData.resourceType;
    if ("Allergy" === this.ResourceType) {
        this.resourceType = resourceData.resourceType;
        this.allergyDisplay = resourceData.AllergyDisplay;
        this.allergyRecordedDate = resourceData.AllergyRecordedDate;
    } else if ("Diagnosis" === this.ResourceType) {
        this.resourceType = resourceData.resourceType;
        this.diagnosisCode = resourceData.DiagnosisCode;
        this.diagnosisDescription = resourceData.DiagnosisDescription;
        this.diagnosisRecordedDate = resourceData.DiagnosisRecordedDate;
    } else if ("BloodGroup" === this.ResourceType) {
        this.resourceType = resourceData.resourceType;
        this.bloodGroup = resourceData.BloodGroup;
        this.recordedDate = resourceData.RecordedDate;
    } else if ("Insurance" === this.ResourceType) {
        this.resourceType = this.ResourceType;
        this.insuranceName = resourceData.InsuranceName;
        this.insuranceNumber = resourceData.InsuranceNumber;
        this.insuranceValidityStartDate = resourceData.InsuranceValidityStartDate;
        this.insuranceValidityEndDate = resourceData.InsuranceValidityEndDate;
    }
}

function OrganDonar(response) {
    this.organDonar = response;
}

function Child(childData) {
    this.childIdNumber = childData.ChildIdNumber;
    this.firstNameArabic = childData.FirstNameArabic;
    this.firstNameEnglish = childData.FirstNameEnglish;
    this.gender = childData.Gender;
    this.dateOfBirth = childData.DateOfBirth;
    this.placeOfBirthArabic = childData.PlaceOfBirthArabic;
    this.placeOfBirthEnglish = childData.PlaceOfBirthEnglish;
    this.motherIdNumber = childData.MotherIdNumber;
    this.motherFullNameArabic = childData.MotherFullNameArabic;
    this.motherFullNameEnglish = childData.MotherFullNameEnglish;
}

function HeadOfFamily(headData) {
    this.holderIDNumber = headData.HolderIdNumber;
    this.familyID = headData.FamilyId;
    this.emirateNameArabic = headData.EmirateNameArabic;
    this.emirateNameEnglish = headData.EmirateNameEnglish;
    this.firstNameArabic = headData.FirstNameArabic;
    this.firstNameEnglish = headData.FirstNameEnglish;
    this.fatherNameArabic = headData.FatherNameArabic;
    this.fatherNameEnglish = headData.FatherNameEnglish;
    this.grandFatherNameArabic = headData.GrandFatherNameArabic;
    this.grandFatherNameEnglish = headData.GrandFatherNameEnglish;
    this.tribeArabic = headData.TribeArabic;
    this.tribeEnglish = headData.TribeEnglish;
    this.clanArabic = headData.ClanArabic;
    this.clanEnglish = headData.ClanEnglish;
    this.nationalityCode = headData.NationalityCode;
    this.nationalityArabic = headData.NationalityArabic;
    this.nationalityEnglish = headData.NationalityEnglish;
    this.gender = headData.Gender;
    this.dateOfBirth = headData.DateOfBirth;
    this.placeOfBirthArabic = headData.PlaceOfBirthArabic;
    this.placeOfBirthEnglish = headData.PlaceOfBirthEnglish;
    this.motherFullNameArabic = headData.MotherFullNameArabic;
    this.motherFullNameEnglish = headData.MotherFullNameEnglish;
}

function Toolkit(onOpenCB, onCloseCB, onErrorCB, options) {
    this.appOnOpenCB = onOpenCB;
    this.appOnCloseCB = onCloseCB;
    this.appOnErrorCB = onErrorCB;
    this.config_params = btoa(options.toolkitConfig || "");
    LOG = options.debugEnabled ? console.log.bind(console) : function () {};

    secure = options.agent_tls_enabled ? "wss://" : "ws://";

    var toolkitThis = this;
    var toolkitOnOpenCB = function (responseEvent) {
        services.ESTABLISH_CONTEXT.config_params = toolkitThis.config_params;
        var user_Agent = (navigator.sayswho = (function () {
            var N = navigator.appName,
                ua = navigator.userAgent,
                tem,
                M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*([\d\.]+)/i);
            if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
            M = M ? [M[1], M[2]] : [N, navigator.appVersion, "-?"];
            return M.join(" ");
        })());

        if (null == user_Agent) {
            services.SendRequest(JSON.stringify(services.ESTABLISH_CONTEXT), wsOnContextEstablishedCB, toolkitThis.appOnOpenCB);
        } else {
            services.ESTABLISH_CONTEXT.user_agent = user_Agent;
            services.SendRequest(JSON.stringify(services.ESTABLISH_CONTEXT), wsOnContextEstablishedCB, toolkitThis.appOnOpenCB);
        }
    };

    var toolkitOnCloseCB = function (responseEvent) { toolkitThis.appOnCloseCB(responseEvent.code); };
    var toolkitOnErrorCB = function (responseEvent) { toolkitThis.appOnErrorCB(responseEvent); };

    services = new ToolkitService(toolkitOnOpenCB, toolkitOnCloseCB, toolkitOnErrorCB, options);

    var initialize = function (configParams) {
        configParams = configParams || "";
        this.config_params = configParams;
        services.establishConnection();
    };

    this.listReaders = function (appCallBack) {
        services.LIST_READER_REQUEST.service_context = window.service_context;
        services.SendRequest(JSON.stringify(services.LIST_READER_REQUEST), toolkitListReaderCB, appCallBack);
    };

    var wsOnContextEstablishedCB = function (appCallback, response) {
        var result = JSON.parse(response.data);
        if ("fail" === result.status) {
            var error = new ToolkitException(result.error || ErrorCodes.SERVICE_COMMUNICATION_ERROR, result.description, ExceptionType.TOOLKIT_ERROR, null);
            appCallback(null, error);
        }
        if ("success" === result.status) {
            service_context = result.service_context;
            appCallback(result.status, null);
        }
    };

    var toolkitListReaderCB = function (appCallBack, responseEvent) {
        try {
            var parsor = new ToolkitResponse(responseEvent);
            var result = JSON.parse(responseEvent.data);
            var filterData = result.smartcard_readers;
            var listArray = filterData.indexOf(",") > -1 ? filterData.split(",") : filterData;
            var cardReaders = [];
            for (let i = 0; i < listArray.length; i++) {
                cardReaders.push(new CardReader(listArray[i]));
            }
            appCallBack(cardReaders, null);
        } catch (error) { appCallBack(null, error); }
    };

    this.getReaderWithEmiratesId = function (appCallBack) {
        services.GET_READER_WITH_EID.service_context = service_context;
        services.SendRequest(JSON.stringify(services.GET_READER_WITH_EID), getReaderWithEmiratesIdCB, appCallBack);
    };

    var getReaderWithEmiratesIdCB = function (appCallBack, responseEvent) {
        try {
            var parsor = new ToolkitResponse(responseEvent);
            var result = JSON.parse(responseEvent.data);
            var readerName = result.smartcard_reader;
            var readerSerialNumber = null;
            if (1 === result.serial_number_status) readerSerialNumber = result.reader_serial_number;
            appCallBack(new CardReader(readerName, readerSerialNumber), null);
        } catch (error) { appCallBack(null, error); }
    };

    this.cleanup = function () {
        services.CLEANUP_CONTEXT.service_context = window.service_context;
        services.SendRequest(JSON.stringify(services.CLEANUP_CONTEXT), services.cleanup, this.appOnCloseCB);
    };

    try { initialize(options.toolkitConfig); }
    catch (error) { onErrorCB(error); }
}

function ToolkitService(onOpenCB, onCloseCB, onErrorCB, options) {
    this.onOpenCB = onOpenCB;
    this.onCloseCB = onCloseCB;
    this.onErrorCB = onErrorCB;
    this.jnlp_address = options["jnlp_address"];

    var DEFAULT_URLS;
    if (options.agent_tls_enabled) {
        if (options.agent_host_name != undefined && options.agent_host_name != "") {
            DEFAULT_URLS = [options.agent_host_name + ":9004", options.agent_host_name + ":9005", options.agent_host_name + ":9020"];
        } else {
            DEFAULT_URLS = ["toolkitagent.emiratesid.ae:9004", "toolkitagent.emiratesid.ae:9005", "toolkitagent.emiratesid.ae:9020"];
        }
    } else {
        DEFAULT_URLS = ["127.0.0.1:9004", "127.0.0.1:9005", "127.0.0.1:9020"];
    }

    this.CONFIRM_TEXT_WINDOWS = "ICA agent is not running. Please install ICA agent and try again. To install ICA agent click OK.";

    this.LIST_READER_REQUEST = { cmd: 3, service_context: "" };
    this.CONNECT_READER = { cmd: 4, service_context: "", smartcard_reader: "" };
    this.DISCONNECT_REQUEST = { cmd: 5, service_context: "", card_context: "" };
    this.PUBLIC_DATA_REQUEST = { cmd: 6, service_context: "", card_context: "", read_photography: "", read_non_modifiable_data: "", read_modifiable_data: "", request_id: "", signature_image: "", address: "" };
    this.ESTABLISH_CONTEXT = { cmd: 1, config_params: "" };
    this.CLEANUP_CONTEXT = { cmd: 2, service_context: "" };
    this.GET_READER_WITH_EID = { cmd: 54, service_context: "" };
    this.GET_INTERFACE = { cmd: 19, card_context: "", service_context: "" };

    var webSocket = null;
    var isWSConnected = false;
    var initializingWsIndex = -1;
    var wsUrl = "";
    var webSocketProtocol = "eida-toolkit";
    this.readerContext = null;
    this.onMessageCB = null;
    var self = this;

    var callbackParams = { cmd: "", sequence: "", appCallBack: null, toolkitCB: null };
    var sequenceCounter = 0;
    var isRequestPending = false;

    var downloadAgent = function () {
        var deviceType = checkDeviceType();
        if ("Windows" === deviceType || "Linux" === deviceType || "iOS" === deviceType) {
            var result = confirm(self.CONFIRM_TEXT_WINDOWS);
            if (true == result) { window.location.href = self.jnlp_address; }
            else { self.onErrorCB("Web socket connection failed."); }
        }
        return "-1";
    };

    this.SendRequest = function (request, toolkitListReaderCB, appCallBack) {
        if (!isRequestPending) {
            if (webSocket === undefined || webSocket.readyState === WebSocket.CLOSED) {
                return "webSocket connection is not open";
            }
            if (webSocket.readyState === WebSocket.OPEN) {
                request = JSON.parse(request);
                sequenceCounter = sequenceCounter + 1;
                request.sequence = sequenceCounter;
                callbackParams.cmd = request.cmd;
                callbackParams.sequence = request.sequence;
                callbackParams.appCallBack = appCallBack;
                callbackParams.toolkitCB = toolkitListReaderCB;
                request = JSON.stringify(request);
                isRequestPending = true;
                webSocket.send(request);
                return "";
            }
            var error = new ToolkitException(ErrorCodes.SERVICE_COMMUNICATION_ERROR, "Service communication failed..", ExceptionType.TOOLKIT_ERROR, null);
            appCallBack(null, error);
        } else {
            var error = new ToolkitException(ErrorCodes.SERVICE_BUSY, "Preivious Request is already in progress..", ExceptionType.TOOLKIT_ERROR, null);
            appCallBack(null, error);
        }
    };

    var checkDeviceType = function () {
        var ua = navigator.userAgent;
        if (ua.match(/(iPhone|iPod|iPad)/)) return "iPhone";
        if (ua.match(/BlackBerry/)) return "BlackBerry";
        if (ua.match(/Android/)) return "Android";
        if (ua.match(/Windows/)) return "Windows";
        if (ua.match(/Linux/)) return "Linux";
    };

    var initializeWS = function () {
        try {
            if (webSocket !== null && webSocket !== undefined && webSocket.readyState !== WebSocket.OPEN && webSocket.readyState == WebSocket.OPEN) {
                return "WebSocket is already active...";
            }
            webSocket = new WebSocket(secure + wsUrl, webSocketProtocol);
            webSocket.onopen = function (event) {
                isWSConnected = true;
                self.onOpenCB(event);
            };
            webSocket.onmessage = function (event) { processResponse(event); };
            webSocket.onclose = function (event) {
                if (false == isWSConnected && 1006 == event.code) {
                    self.establishConnection();
                    return;
                }
                if (true == isWSConnected && null !== self.onCloseCB && undefined !== self.onCloseCB) {
                    self.readerContext = null;
                    self.webSocket = null;
                    self.onMessageCB = null;
                    self.onErrorCB = null;
                    self.onOpenCB = null;
                    isWSConnected = false;
                    initializingWsIndex = -1;
                    wsUrl = "";
                    self.onCloseCB(event);
                    self.onCloseCB = null;
                }
            };
            webSocket.onerror = function (event) {
                if (null !== self.onErrorCB && undefined !== self.onErrorCB && true == isWSConnected) {
                    self.onErrorCB("Error in web socket connection..clossing web socket");
                }
            };
        } catch (e) { return "Webcomponent Initialization Failed, Details: " + e; }
        return "";
    };

    this.cleanup = function (appCallBack, responseEvent) {
        if (webSocket != null || webSocket != undefined || webSocket.readyState != WebSocket.CLOSED) {
            webSocket.close();
        }
    };

    this.establishConnection = function () {
        isWSConnected = false;
        initializingWsIndex = initializingWsIndex + 1;
        wsUrl = DEFAULT_URLS[initializingWsIndex];
        if (undefined == wsUrl) {
            initializingWsIndex = -1;
            downloadAgent();
            return "";
        }
        var ret = initializeWS();
    };

    var processResponse = function (event) {
        var result = JSON.parse(event.data);
        isRequestPending = false;
        if (callbackParams.sequence == result.sequence) {
            if (undefined !== callbackParams.toolkitCB) {
                callbackParams.toolkitCB(callbackParams.appCallBack, event);
            }
        }
    };
}

function CardReader(readerName, readerSerialNumber) {
    this.readerName = readerName;
    this.readerSerialNumber = readerSerialNumber;
    var readerContext = null;
    var connected = false;

    this.connect = function (appCallBack) {
        services.CONNECT_READER.smartcard_reader = this.readerName;
        services.CONNECT_READER.service_context = service_context;
        services.SendRequest(JSON.stringify(services.CONNECT_READER), toolkitConnectCB, appCallBack);
    };

    this.getReaderName = function () { return this.readerName; };
    this.getReaderSerialNumber = function () { return this.readerSerialNumber; };

    this.readPublicData = function (requestId, readNonModifiableData, readModifiableData, readPhotography, readSignatureImage, readAddress, appCallBack) {
        if (!connected) {
            var error = new ToolkitException(ErrorCodes.READER_NOT_CONNECTED_ERROR, "Reader not connected..", ExceptionType.TOOLKIT_ERROR, null);
        }
        services.PUBLIC_DATA_REQUEST.service_context = window.service_context;
        services.PUBLIC_DATA_REQUEST.card_context = readerContext;
        services.PUBLIC_DATA_REQUEST.read_photography = readPhotography;
        services.PUBLIC_DATA_REQUEST.read_non_modifiable_data = readNonModifiableData;
        services.PUBLIC_DATA_REQUEST.read_modifiable_data = readModifiableData;
        services.PUBLIC_DATA_REQUEST.request_id = requestId;
        services.PUBLIC_DATA_REQUEST.signature_image = readSignatureImage;
        services.PUBLIC_DATA_REQUEST.address = readAddress;
        var validate = ValidateParams(services.PUBLIC_DATA_REQUEST, appCallBack);
        if (validate) {
            services.SendRequest(JSON.stringify(services.PUBLIC_DATA_REQUEST), toolkitPubDataCB, appCallBack);
        }
    };

    this.getInterfaceType = function (appCallBack) {
        services.GET_INTERFACE.service_context = window.service_context;
        services.GET_INTERFACE.card_context = readerContext;
        var validate = ValidateParams(services.GET_INTERFACE, appCallBack);
        if (validate) {
            services.SendRequest(JSON.stringify(services.GET_INTERFACE), toolkitgetInterfaceTypeCB, appCallBack);
        }
    };

    var toolkitgetInterfaceTypeCB = function (appCB, responseEvent) {
        try {
            var parsor = new ToolkitResponse(responseEvent);
            parsor = JSON.parse(responseEvent.data);
            appCB(parsor.interface_type, null);
        } catch (error) { appCB(null, error); }
    };

    this.disconnect = function (appCallback) {
        if (!connected) {
            var error = new ToolkitException(ErrorCodes.READER_NOT_CONNECTED_ERROR, "Reader not connected..", ExceptionType.TOOLKIT_ERROR, null);
        }
        services.DISCONNECT_REQUEST.service_context = window.service_context;
        services.DISCONNECT_REQUEST.card_context = readerContext;
        services.SendRequest(JSON.stringify(services.DISCONNECT_REQUEST), disconnectCB, appCallback);
    };

    var disconnectCB = function (appCB, response) {
        try {
            var parsor = new ToolkitResponse(response);
            appCB("success", null);
        } catch (error) { appCB(null, error); }
    };

    this.isConnected = function () { return connected; };

    var toolkitConnectCB = function (appCB, responseEvent) {
        try {
            var parsor = new ToolkitResponse(responseEvent);
            var result = JSON.parse(responseEvent.data);
            readerContext = result.card_context;
            connected = true;
            appCB("success", null);
        } catch (error) { appCB(null, error); }
    };

    var toolkitPubDataCB = function (appCB, responseEvent) {
        try {
            var publicDataResponse = new CardPublicData(responseEvent);
            appCB(publicDataResponse, null);
        } catch (error) { appCB(null, error); }
    };
}

function ToolkitException(code, message, errorType, attemptsLeft) {
    this.code = code;
    this.message = message;
    this.exceptionType = errorType;
    this.attemptsLeft = attemptsLeft;
}

function ToolkitExceptionWithResponse(toolkit_response, code, message, errorType, attemptsLeft) {
    this.toolkit_response = toolkit_response;
    this.message = message;
    this.exceptionType = errorType;
    this.attemptsLeft = attemptsLeft;
    this.code = code;
}

function ToolkitResponse(response) {
    this.tooklitResponse = null;
    this.message = null;
    var header = null;
    var body = null;
    var responseStatus = null;
    this.xmlString = null;
    this.response = null;
    var result = JSON.parse(response.data);
    this.status = result.status;
    this.tooklitResponse = result.toolkit_response;

    if (0 < result.error_code) {
        var error;
        if (null != result.attempts_left && undefined != result.attempts_left && null != result.toolkit_response && undefined != result.toolkit_response) {
            error = new ToolkitExceptionWithResponse(result.toolkit_response, result.error_code, result.error_message, ExceptionType.CARD_PIN_ERROR, result.attempts_left);
        } else if (null != result.attempts_left && undefined != result.attempts_left) {
            error = new ToolkitException(result.error_code, result.error_message, ExceptionType.CARD_PIN_ERROR, result.attempts_left);
        } else if (null != result.toolkit_response && undefined != result.toolkit_response) {
            error = new ToolkitExceptionWithResponse(result.toolkit_response, result.error_code, result.error_message, ExceptionType.TOOLKIT_ERROR, null);
        } else {
            error = new ToolkitException(result.error_code, result.error_message, ExceptionType.TOOLKIT_ERROR, null);
        }
        throw error;
    }

    if (null !== result.toolkit_response && undefined !== result.toolkit_response && result.toolkit_response.length > 0) {
        var domParser = new DOMParser();
        var jsonObj = { ValidationGatewayResponse: null };
        try {
            var xmlDoc = domParser.parseFromString(result.toolkit_response, "text/xml");
            jsonObj = xmlToJson(xmlDoc);
        } catch (e) {}

        if (jsonObj.ValidationGatewayResponse) {
            this.message = jsonObj.ValidationGatewayResponse.Message;
            validateElement(this.message, "Message");
            header = this.message.Header;
            validateElement(header, "Header");
            body = this.message.Body;
            validateElement(body, "Body");
            responseStatus = body.ResponseStatus;
            validateElement(responseStatus, "ResponseStatus");
            if ("Success" !== responseStatus) {
                var error = new ToolkitException(result.error_code, result.error_message, ExceptionType.TOOLKIT_ERROR, null);
                throw error;
            }
            this.xmlString = result.toolkit_response;
            this.cardNumber = header.CardNumber;
            this.cardSerialNumber = header.CardSerialNumber;
            this.iDNumber = header.IDNumber;
            this.requestId = header.RequestID;
            this.service = header.Service;
            this.timeStamp = header.Timestamp;
        } else {
            this.response = result.toolkit_response;
        }
    } else if ("success" === result.status && undefined === result.toolkit_response) {
        return result;
    }

    function validateElement(element, elementName) {
        if (null == element || undefined == element) {
            var error = new ToolkitException(303, "Invalid Toolkit Response XML Format. Element not found :" + elementName, ExceptionType.TOOLKIT_ERROR, null);
            throw error;
        }
    }
}

function xmlToJson(xml) {
    var obj = {};
    if (xml.nodeType == 1) {
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType == 3) {
        obj = xml.nodeValue;
    }
    if (xml.hasChildNodes()) {
        if (xml.childNodes.length === 1 && xml.childNodes[0].nodeName === "#text") {
            obj = xml.textContent;
        } else {
            for (var i = 0; i < xml.childNodes.length; i++) {
                var item = xml.childNodes.item(i);
                var nodeName = item.nodeName;
                if ("#text" == nodeName) { nodeName = "text"; }
                if (typeof obj[nodeName] == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof obj[nodeName].push == "undefined") {
                        var old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
    }
    return obj;
}

function CardPublicData(responseJSON) {
    ToolkitResponse.call(this, responseJSON);
    this.cardNumber = this.message.Body.PublicData.CardNumber;
    this.cardHolderPhoto = this.message.Body.PublicData.CardHolderPhoto;
    this.holderSignatureImage = this.message.Body.PublicData.HolderSignatureImage;
    this.modifiablePublicData = new ModifiablePublicData(this.message.Body.PublicData.ModifiableData);
    this.nonModifiablePublicData = new NonModifiablePublicData(this.message.Body.PublicData.NonModifiableData);
    this.homeAddress = new HomeAddress(this.message.Body.PublicData.HomeAddress);
    this.workAddress = new WorkAddress(this.message.Body.PublicData.WorkAddress);
}

CardPublicData.prototype = Object.create(ToolkitResponse.prototype);
CardPublicData.prototype.constructor = CardPublicData;

var ValidateParams = function (requestObj, appCallBack) {
    let IsValidated = true;
    for (var key in requestObj) {
        if (requestObj[key] || requestObj[key] === 0 || requestObj[key] === false) {
            // valid
        } else {
            IsValidated = false;
            var error = new ToolkitException(ErrorCodes.INVALID_FIELD, "'" + key + "' value is invalid", ExceptionType.TOOLKIT_ERROR, null);
            appCallBack(null, error);
            break;
        }
    }
    return IsValidated;
};
