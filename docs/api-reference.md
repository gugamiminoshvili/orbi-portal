# Mobile API reference

Paths below are relative to the API base URL. Send `Authorization: Bearer <access-token>` unless a block says **Public**. JSON bodies use `Content-Type: application/json`; ticket upload uses `multipart/form-data`.

Every JSON error uses the following shape (the `error` field is present when the implementation assigns an error code):

```json
{"code": -1, "msg": "reason", "result": [], "error": "OPTIONAL_ERROR_CODE"}
```

## Authentication and account

### POST `/mobileApi/auth/` — Public

**All params:** body `username` (string), `password` (string); `device_id` (string, optional).

**Response when OK:** `{"access":"...","refresh":"...","user_id":1,"smsPhone":"...","mail":"...","privileged":false}`. If device verification is pending, the same tokens are returned in `result` with `code: -2`.

**Response when fail:** `{"code":-3,"msg":"credentials do not match","result":[],"error":"CREDENTIALS_DO_NOT_MATCH"}`; other possible errors include `DOES_NOT_EXIST_OR_NO_WEB_ACCESS`, `CUSTOMER_IS_BLOCKED`, and `NO_VALID_PHONE_OR_EMAIL`.

### POST `/mobileApi/refresh/` — Public

**All params:** body `refresh` (string).

**Response when OK:** `{"access":"...","refresh":"...","user_id":1,"smsPhone":"...","mail":"...","privileged":false}`.

**Response when fail:** DRF validation response for a missing, expired, invalid, or blacklisted refresh token.

### POST `/mobileApi/auth/verify/`

**All params:** body `code`.

**Response when OK:** `{"code":1,"msg":"success","result":[]}`.

**Response when fail:** `CODE_NOT_PROVIDED`, `CODE_EXPIRED`, or `CODE_NOT_CORRECT`.

### POST `/mobileApi/auth/check/` — Public

**All params:** body `customer_id` (integer), `password` (string).

**Response when OK:** `{"code":1,"msg":"success","result":[]}`.

**Response when fail:** `CUSTOMER_DOES_NOT_EXIST` or `PASSWORD_NOT_CORRECT`.

### POST `/mobileApi/verify/send/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"verification code was sent","result":[]}`.

**Response when fail:** `NO_PHONE_OR_EMAIL`, or an authentication error.

### POST `/mobileApi/verify/`

**All params:** body `device_uuid` is required only when device checking is enabled for the customer.

**Response when OK:** raw `{}` with HTTP 200.

**Response when fail:** `INVALID_TOKEN`, `DEVICE_CHECK_UNSUCCESSFUL`, or `DEVICE_CHECK_ENABLED_BUT_UNSUCCESSFUL`.

### POST `/mobileApi/logoutAll/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"success","result":[]}`.

**Response when fail:** authentication error.

### GET `/mobileApi/user/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"success","result":{"id":1,"...":"token-derived customer fields"}}`.

**Response when fail:** authentication/token error.

### PATCH `/mobileApi/user/`

**All params:** body `lang` (optional string: `en`, `ge`, or `ru`).

**Response when OK:** `{"code":1,"msg":"success","result":{"id":1,"...":"updated customer fields"}}`.

**Response when fail:** `invalid language` or authentication/token error.

### POST `/mobileApi/user/passwordReset/`

**All params:** body `email` (string).

**Response when OK:** `{"code":1,"msg":"password updated","result":[]}`.

**Response when fail:** `EMAIL_NOT_VALID` or `CUSTOMER_NOT_FOUND`.

### POST `/mobileApi/user/passwordResetEmail/` — Public

**All params:** body `email` (string).

**Response when OK:** password-reset-link response from the shared customer view.

**Response when fail:** email validation/reset-token error from the shared customer view.

### POST `/mobileApi/user/reset/` — Public

**All params:** body `token`, `password`, `repeated_password`; `check_pass` (boolean, optional; defaults to `true`).

**Response when OK:** `{"code":1,"msg":"...","result":[]}`; with `check_pass:false`, confirms only token validity.

**Response when fail:** invalid/used token, mismatched passwords, password validation error, or `web access is not enabled`.

### PATCH `/mobileApi/user/passwordChange/`

**All params:** body `current_password` (string), `new_password` (string; at least 6 chars).

**Response when OK:** `{"code":1,"msg":"password changed successfully","result":[]}`.

**Response when fail:** `CURRENT_PASSWORD_IS_WRONG`, `NEW_PASSWORD_IS_THE_SAME`, `PASSWORD_LENGTH_TOO_SHORT`, or authentication error.

### POST `/mobileApi/user/deactivate/`

**All params:** body `code` (integer), `reason` (string), `comment` (string, optional).

**Response when OK:** deactivation-service success envelope.

**Response when fail:** deactivation-service validation/error envelope or authentication error.

### POST `/mobileApi/register/` — Public

**All params:** body `fullname` (string), `email` (string).

**Response when OK:** `{"code":1,"msg":"registration successfully requested","result":[]}`.

**Response when fail:** `JSON_SYNTAX_ERROR`, `MISSING_REQUIRED_FIELDS`, `EMAIL_NOT_VALID`, or `USER_ALREADY_REQUESTED`.

### POST `/mobileApi/register2/` — Public

**All params:** multipart form fields and files accepted by combined registration; no fields are validated directly in this view.

**Response when OK:** combined-registration service response.

**Response when fail:** combined-registration validation/error response.

### GET `/mobileApi/logo/` — Public

**All params:** none.

**Response when OK:** PNG binary body.

**Response when fail:** normal Django file/server error.

## Properties, content, and complexes

### GET `/mobileApi/properties/`

**All params:** query `complex_id` (integer, optional), `small` (optional flag), `apartment_type` (optional: `Current_Owner`, `Waiting`, or `Resold`).

**Response when OK:** `{"code":1,"msg":"success","result":[{"id":1,"objectId":1,"complex":"...","block":"...","floor":"...","square":"...","apartmentName":"...","epcode":"...","room_number":"...","apartmentBalance":"...","electricityBalance":"...","WaterIndication":"...","InternetTVBalanceGEL":"...","ownership_status":"...","...":"property fields"}]}`.

**Response when fail:** `NO_CUSTOMER_ID`, `COMPLEX_ID_IS_INCORRECT`, `APARTMENT_TYPE_IS_INCORRECT`, or authentication error.

### GET `/mobileApi/properties/v2/`

**All params:** query `complex_id` (integer, optional), `small` (optional flag), `apartment_type` (optional: `owner`, `co_owner`, or `trustee`).

**Response when OK:** same envelope and property-list structure as `/properties/`, using version-2 collection logic.

**Response when fail:** `NO_CUSTOMER_ID`, `COMPLEX_ID_IS_INCORRECT`, `APARTMENT_TYPE_IS_INCORRECT`, or authentication error.

### GET `/mobileApi/flat/{flat_id}/`

**All params:** path `flat_id`.

**Response when OK:** `{"code":1,"msg":"success","result":{"...":"detailed Flat and OneC room information"}}`.

**Response when fail:** `{"code":-1,"msg":"Invalid flat id","result":[]}` or authentication error.

### GET `/mobileApi/complex/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"...":"displayed complex fields, ordered by favourites"}]}`.

**Response when fail:** `NO_CUSTOMER_ID` or authentication error.

### POST `/mobileApi/complex/favorite/`

**All params:** body `complex_id` (integer).

**Response when OK:** `{"code":1,"msg":"complex added to favorites","result":[]}` or `complex removed from favorites`.

**Response when fail:** `MISSING_PARAMETER`, `INVALID_PARAMETER_TYPE`, `NO_CUSTOMER_ID`, `COMPLEX_ID_NOT_PROVIDED`, or `COMPLEX_ID_NOT_VALID`.

### GET `/mobileApi/faq/` — Public

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"ka":[{"...":"FAQ fields"}],"en":[...],"ru":[...]}}`.

**Response when fail:** server/data-access error only.

### GET `/mobileApi/app/` — Public

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"version":"...","notes":{"en":"...","ru":"...","ka":"..."},"release_date":"...","is_force_update":false,"supported_platforms":["iOS","Android"],"authentication":{"required":true,"mechanisms":["JWT","API_KEY_TOKENS"]}}}`.

**Response when fail:** server error when no version record exists.

### GET `/mobileApi/lockHistory/`

**All params:** query `apartmentId` (required), `start_date` and `end_date` (optional, `YYYY-MM-DD HH:MM:SS`), `reservation` (optional), `response_format=pdf` (optional).

**Response when OK:** JSON: `{"code":1,"msg":"success","result":[{"...":"LockHistorySerializer fields"}]}`; PDF format returns a PDF attachment.

**Response when fail:** `MISSING_REQUIRED_FIELDS`, `LOCK_NOT_FOUND`, `NOT_OWNER`, `Error while generating pdf`, or authentication error.

### GET `/mobileApi/currency/rate/`

**All params:** parameters are delegated to the shared `currency_rate` implementation.

**Response when OK:** shared currency-rate JSON response.

**Response when fail:** shared currency-rate validation/error response.

## Dashboard, documents, finance, and payment

### GET `/mobileApi/dashboard/visits/`

**All params:** query `only_city` (optional boolean; only literal `true` enables it).

**Response when OK:** `{"code":1,"msg":"ok","result":{"current_count":0,"awaiting_count":0,"new_count":0,"visits":{"new":[],"current":[],"awaiting":[]},"stats":{}}}`.

**Response when fail:** authentication/token error.

### GET `/mobileApi/dashboard/crm_finance/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"remain":0,"overdue":0,"overdue_invoices_count":0,"paid_percentage":0,"left_percentage":100,"customer_crm_id":"..."}}`.

**Response when fail:** `CUSTOMER_HAS_NO_CRM_ID` or authentication error.

### GET `/mobileApi/dashboard/communals/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"...":"electricity, internet, apartment balance/debt totals and details"}}`.

**Response when fail:** authentication/token error.

### GET `/mobileApi/documents/`

**All params:** query `flats` (optional comma-separated flat IDs).

**Response when OK:** `{"code":1,"msg":"ok","result":[{"id":1,"download_url":"...","type":"...","flat":{"id":1,"apartmentName":"...","flat":"...","floor":"...","cadastre":"...","complex_id":1},"flat_crm_id":"..."}]}`.

**Response when fail:** invalid flat/document selection error or authentication error.

### GET `/mobileApi/finance/schedule/`

**All params:** query `deal_id` (optional).

**Response when OK:** `{"code":1,"msg":"ok","result":{"schedule":[{"id":1,"UF_DEAL_ID":"...","DATE_PAY_BEFORE":"YYYY-MM-DD","INVOICE_SUM":0,"PAID_SUM":0,"DEBTS":0,"STATUS_ID":"..."}]}}`.

**Response when fail:** authentication/data-access error.

### GET `/mobileApi/finance/tournover/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"deals":{"<deal-id>":{"total":0,"paid":0,"remain":0,"status":"Current","overdue":0,"paid_percentage":0}}}}`.

**Response when fail:** `CUSTOMER_HAS_NO_CRMID` or authentication error.

### GET `/mobileApi/finance/filter/`

**All params:** query `startDate`, `endDate`, `flats`, `accountType`, plus supported finance filter fields; all are optional.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"...":"filtered transaction or revenue fields"}],"filters":{}}`.

**Response when fail:** invalid date/filter/flat error or authentication error.

### GET `/mobileApi/finance/`

**All params:** query `flatId` (required integer), `accountType` (required: `water`, `electricity`, `internettv`, or `apartment`), `startDate`, `endDate`, `limit`, `offset`, `response_format` (`json` or `pdf`; all optional).

**Response when OK:** JSON account result contains transaction/balance data; transaction items have `{accountType,apartmentName,apartmentId,service,event,docNo,docDate,docType,currency,currencySymbol,amount,balance,electricity_reading}`. PDF mode returns a file attachment.

**Response when fail:** missing/invalid `flatId` or `accountType`, invalid pagination/format, missing flat, or authentication error.

### GET `/mobileApi/finance/{id}/`

**All params:** path `id` (integer); query `accountType` (required: `electricity`, `internettv`, `apartment`, or `revenue`).

**Response when OK:** transaction object for service accounts, or revenue object `{id,accountType,roomsId,roomId,docDate,docType,currency,owner,ownerTIN,bankAccount,bank,amount}`.

**Response when fail:** `INVALID_TRANSACTION_ID` or `INVALID_ACCOUNT_TYPE`.

### GET `/mobileApi/payment/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"success","result":[{"...":"CustomerInvoiceSerializer fields"}]}`.

**Response when fail:** authentication/token error.

### POST `/mobileApi/payment/`

**All params:** body `epcode` (integer), `amount` (number), `serviceType` (string); `lang` can also be supplied.

**Response when OK:** `{"code":1,"msg":"success","result":{"url":"https://..."}}`.

**Response when fail:** missing/invalid body parameter or payment-provider error.

### POST `/mobileApi/payment/multi/`

**All params:** body `services` (required array); optional `vendor`, `as_invoice` (boolean), `open_banking`, `direct_card`, `crypto`, `language`, `isMobile` (boolean).

**Response when OK:** multi-payment provider result (normally payment URL/invoice data).

**Response when fail:** `MISSING_OR_INVALID_PARAMETER`, invalid service payload, or provider error.

### GET `/mobileApi/payment/invoice/`

**All params:** query `invoice_id` (required numeric), `response_type` (required).

**Response when OK:** requested invoice response/file.

**Response when fail:** `invoice_id was not provided`, `invoice_id is not valid`, `response_type is not valid`, or invoice ownership/not-found error.

## Internet and TV

### GET `/mobileApi/internettv/`

**All params:** query `flat` (optional numeric flat ID).

**Response when OK:** latest agreement serializer object, or `{}` when inactive/not found.

**Response when fail:** `flat id is not provided` / invalid-flat error or authentication error.

### POST `/mobileApi/internettv/`

**All params:** body `flat_id` (integer), `date` (string), `tariff_net_id` (integer), `tariff_tv_id` (integer).

**Response when OK:** Orbinet agreement-request service result.

**Response when fail:** `MISSING_OR_INVALID_PARAMETER`, invalid flat/tariff/date, or agreement-request error.

### GET `/mobileApi/internettv/{id}/`

**All params:** path `id`.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"...":"Orbinet agreement serializer fields"}]}`.

**Response when fail:** authentication error; unknown ID produces an empty array.

### PATCH `/mobileApi/internettv/pause/`

**All params:** body `flat_id` (integer), `pause` (boolean).

**Response when OK:** updated agreement serializer object.

**Response when fail:** `MISSING_OR_INVALID_PARAMETER`, no active agreement, or update error.

### GET `/mobileApi/internettv/tariff/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"internet":[],"tv":[],"boost":[],"combined":[]}}`.

**Response when fail:** tariff data/service error.

### GET `/mobileApi/internettv/boost-net/list/`

**All params:** query `flat_id` (optional string/integer), `epcode` (optional string).

**Response when OK:** mobile-boost list service response.

**Response when fail:** invalid parameter type or boost service error.

### POST `/mobileApi/internettv/boost-net/activate/`

**All params:** body `tariffId` (integer); optional `flat_id` (integer), `epcode` (string), `inQueue` (boolean).

**Response when OK:** boost activation service response.

**Response when fail:** missing/invalid `tariffId`, or boost activation error.

### GET `/mobileApi/internettv/report/`

**All params:** query `flat_id` (required), `limit` (optional, default 15), `offset` (optional, default 0), and supported PDF flag.

**Response when OK:** paginated report serializer result or PDF.

**Response when fail:** `limit and offset should be integers`, invalid flat/report, or authentication error.

### POST `/mobileApi/internettv/update_package/`

**All params:** body `flat_id` (integer), `date` (string), `tariff_net_id` (integer), `tariff_tv_id` (integer).

**Response when OK:** package-update request result.

**Response when fail:** missing/invalid body parameter, invalid tariff/agreement, or update error.

## Visits and keys

### GET `/mobileApi/visit/`

**All params:** query `income_date`, `exit_date`, `year`, `flats`, `complex_id`, `reservation_id`, `status`, `current`, `only_city`, `limit`, `offset` (all optional).

**Response when OK:** `{"code":1,"msg":"ok","result":{"visits":[{"...":"reservation fields"}],"visit_requests":[...],"filters":{},"visit_count":0,"visit_request_count":0,"flats":[{"id":1,"apartmentName":"...","flat":"...","floor":"...","cadastre":"...","complex_id":1}],"complexes":[{"id":1,"name":"..."}],"msg":"successfully filtered"}}`.

**Response when fail:** invalid filter/date/flat, `No flats found for this customer`, or authentication error.

### POST `/mobileApi/visit/`

**All params:** body `apartment_id`, `who` (`owner` or `guest`), `income_date`, `exit_date` (all required). For `who:"guest"`, each `guests` item requires `fName`, `lName`, `personal_id`, `country`, `gender`, `number`, `email`, `citizen`. Additional booking fields are accepted by the booking service.

**Response when OK:** created reservation ID/service result.

**Response when fail:** missing booking fields, invalid dates/flat/ownership/guest data, unavailable flat, or upstream booking error.

### GET `/mobileApi/visit/{id}/`

**All params:** path `id` (integer).

**Response when OK:** detailed reservation serializer object.

**Response when fail:** `id must be integer` or `reservation with this id does not exist`.

### GET `/mobileApi/visit/pdf/`

**All params:** query `income_date`, `exit_date` (optional).

**Response when OK:** PDF attachment.

**Response when fail:** `pdf generation failed` or authentication error.

### GET `/mobileApi/visit/calendar/`

**All params:** query `year`, `flats`, `complex_id`, `reservation_id`, `status`, `income_date`, `exit_date`, `current`, `only_city` (all optional).

**Response when OK:** `{"code":1,"msg":"ok","result":{"visits":[],"filters":{},"count":0,"flats":[],"nights":{},"complexes":[],"msg":"successfully filtered"}}`.

**Response when fail:** requested flat does not belong to customer, invalid filters, or authentication error.

### PATCH `/mobileApi/visit/set_key/`

**All params:** body `reservation_id` (integer), `key_type` (`ekey`, `card`, or `no`).

**Response when OK:** updated reservation serializer object.

**Response when fail:** missing/invalid parameter, invalid `key_type`, or invalid `reservation_id`.

### POST `/mobileApi/visit/get_unlock_command/`

**All params:** body `reservation_id` (integer).

**Response when OK:** `{"code":1,"msg":"ok","result":{"unlock_command":"..."}}`.

**Response when fail:** missing/invalid reservation ID, reservation/lock validation failure, Omni authentication failure, or key-generation error.

### POST `/mobileApi/visit/confirm_predict/`

**All params:** body `reservation_id` (integer).

**Response when OK:** `{"code":1,"msg":"success","result":[{"...":"ReservationsSerializer fields"}]}`.

**Response when fail:** missing/invalid parameter or `Reservation not found`.

### PATCH `/mobileApi/visit/confirm/`

**All params:** body `reservation_id`, `key_send` (boolean).

**Response when OK:** `{"code":1,"msg":"ok","result":123}` (reservation ID).

**Response when fail:** missing fields, `RESERVATION_ALREADY_CONFIRMED`, `RESERVATION_ALREADY_CANCELED`, `RESERVATION_NOT_CONFIRMED`, `FLAT_IS_TAKEN`, email/lock validation, or upstream booking error.

### PATCH `/mobileApi/visit/cancel/`

**All params:** body `reservation_id` (required); `lang` (optional, defaults to `en`).

**Response when OK:** `{"code":1,"msg":"ok","result":123}` (reservation ID).

**Response when fail:** JSON syntax error, `MISSING_REQUIRED_FIELDS`, `RESERVATION_ALREADY_CANCELED`, `RESERVATION_ID_NOT_VALID`, or upstream cancellation error.

### GET `/mobileApi/visit/status/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"id":4,"name":"..."}]}`.

**Response when fail:** authentication/data-access error.

### GET `/mobileApi/keys/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"keys":[],"count":"..."}}` (service-defined key payload).

**Response when fail:** customer/Omnitec/key-service error or authentication error.

### GET `/mobileApi/keys/count/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"...":"per-room key counts"}}`.

**Response when fail:** authentication/key-service error.

### POST `/mobileApi/keys/generate/`

**All params:** body `reservation_id` plus the apartment/start/end fields required by key `prepare_params`.

**Response when OK:** generated-key service result.

**Response when fail:** missing `reservation_id`, missing/invalid key dates/apartment, no lock/credentials, or key-service error.

### POST `/mobileApi/keys/{id}/prolong/`

**All params:** path `id` (key ID); body apartment/start/end fields required by key `prepare_params`.

**Response when OK:** prolonged-key service result.

**Response when fail:** `OMNI_CREDENTIALS_NOT_FOUND`, `KEY_PROLONG_FAILED`, missing/invalid request fields, or authentication error.

### POST `/mobileApi/keys/{id}/freeze/`

**All params:** path `id` (key ID).

**Response when OK:** `{"code":1,"msg":"key has been frozen","result":[]}`.

**Response when fail:** `KEY_FREEZE_FAILED`.

### POST `/mobileApi/keys/{id}/unfreeze/`

**All params:** path `id` (key ID).

**Response when OK:** `{"code":1,"msg":"key has been unfrozen","result":[]}`.

**Response when fail:** `KEY_UNFREEZE_FAILED`.

## Tickets, notifications, feedback, devices, and news

### GET `/mobileApi/tickets/`

**All params:** query `onlyActive` (optional literal `true`), `limit` (optional, default 15), `offset` (optional, default 0).

**Response when OK:** `{"code":1,"msg":"ok","result":{"...":"ticket list/pagination payload containing Ticket objects"},"time":"..."}`. A Ticket has `{id,subject,created_at,updated_at,updated_by,closed_at,depId,status,customerId,forwarded,new_messages,last_msg,last_msg_time}`.

**Response when fail:** `CUSTOMER_NOT_FOUND`, pagination/service error, or authentication error.

### POST `/mobileApi/tickets/`

**All params:** body fields required by ticket creation validation (ticket subject/category/message data).

**Response when OK:** created ticket service response.

**Response when fail:** ticket validation/creation error or authentication error.

### GET `/mobileApi/tickets/{id}/`

**All params:** path `id`.

**Response when OK:** customer-owned ticket-list service result containing `Ticket`.

**Response when fail:** `NOT_YOUR_TICKET` or authentication error.

### PATCH `/mobileApi/tickets/{id}/`

**All params:** path `id`; body consumed by the close-ticket service.

**Response when OK:** closed-ticket service result.

**Response when fail:** `NOT_YOUR_TICKET` or close-ticket validation error.

### GET `/mobileApi/tickets/{id}/messages/`

**All params:** path `id`.

**Response when OK:** `{"code":1,"msg":"success","result":[{"id":1,"created_at":"...","ticketId":1,"reply":0,"author":1,"message":"...","authorFullname":"...","files":[{"id":1,"size":"1 Mb","type":"...","url":"ticket_file/1/"}]}]}`.

**Response when fail:** ticket/message service error or authentication error.

### POST `/mobileApi/tickets/{id}/messages/`

**All params:** path `id`; body `message` (string). Legacy fallback also reads query `message`.

**Response when OK:** `{"code":1,"msg":"msg sent","result":{"result":{"msgId":1}}}`.

**Response when fail:** `MISSING_REQUIRED_FIELDS`, invalid JSON/message, ticket error, or authentication error.

### POST `/mobileApi/tickets/file/`

**All params:** multipart `file` (required), `ticketId` form field.

**Response when OK:** `{"code":1,"msg":"file uploaded","result":"ticket_file/1/"}`.

**Response when fail:** `FILE_NOT_FOUND`, `FILE_TYPE_NOT_ALLOWED`, upload error, or authentication error.

### GET `/mobileApi/tickets/new/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":{"...":"new Ticket list payload"},"time":"..."}`.

**Response when fail:** `CUSTOMER_NOT_FOUND` or authentication error.

### GET `/mobileApi/tickets/subject/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"en":"...","ru":"...","ka":"..."}]}`.

**Response when fail:** authentication/data-access error.

### GET `/mobileApi/ticket_file/{file_id}/`

**All params:** path `file_id` (integer).

**Response when OK:** stored image/video/PDF/Word/Excel binary body.

**Response when fail:** `FILE_NOT_FOUND`.

### GET `/mobileApi/notification/`

**All params:** query `lang` (optional: `en`, `ge`, `ru`; defaults to `en`).

**Response when OK:** `{"code":1,"msg":"ok","result":[{"id":1,"datetime":"...","msg":"...","seen":false,"seen_at":null,"type":"...","reservation":1,"flat":{"id":1,"floor":"...","flat":"...","apartmentName":"..."},"ticket":null,"customer":1,"note":"..."}]}`.

**Response when fail:** `INVALID_LANG` or authentication error.

### GET `/mobileApi/notification/{id}/`

**All params:** path `id`; query `lang` (optional: `en`, `ge`, `ru`).

**Response when OK:** one notification object in the same shape; it is marked seen.

**Response when fail:** `NOTIFICATION_NOT_FOUND`, `INVALID_LANG`, or authentication error.

### GET `/mobileApi/notification/seen/`

**All params:** query `lang` (optional), `limit` (optional; default 15), `offset` (optional; default 0).

**Response when OK:** `{"code":1,"msg":"ok","result":["Notification"],"limit":15,"offset":0}`.

**Response when fail:** `INVALID_LANG`, `Invalid limit or offset`, or authentication error.

### POST `/mobileApi/notification/seen/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"notifications seen","result":[]}`.

**Response when fail:** authentication error.

### GET `/mobileApi/feedback/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"id":1,"message":"...","customer":{},"category":{},"created_at":"..."}]}`.

**Response when fail:** incorrect token/authentication error.

### POST `/mobileApi/feedback/`

**All params:** body `message` (string), `category_id` (integer).

**Response when OK:** one feedback object in the same shape as the list endpoint.

**Response when fail:** JSON syntax error, `message and category_id are required`, invalid category, or authentication error.

### GET `/mobileApi/feedback/category/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"ok","result":[{"...":"FeedBackCategorySerializer fields"}]}`.

**Response when fail:** authentication/data-access error.

### GET `/mobileApi/device/`

**All params:** none.

**Response when OK:** `{"code":1,"msg":"...","result":[{"id":1,"customer":1,"device":{"id":1,"device":"...","device_uuid":"...","inserted_at":"...","manufacturer":"...","model":"...","platform":"..."},"verified":true}]}`.

**Response when fail:** authentication/device lookup error.

### POST `/mobileApi/device/`

**All params:** body `device_uuid` (optional string), `device_info` (optional object). A UUID is generated when omitted.

**Response when OK:** `{"code":1,"msg":"device created successfully","result":"<device_uuid>"}`.

**Response when fail:** `NO_CUSTOMER_ID`, device association error, or invalid parameter type.

### GET `/mobileApi/device/{device_uuid}/`

**All params:** path `device_uuid`.

**Response when OK:** `{"code":1,"msg":"success","result":{"id":1,"device":"...","device_uuid":"...","inserted_at":"...","manufacturer":"...","model":"...","platform":"..."}}`.

**Response when fail:** `DEVICE_DOES_NOT_EXIST` or authentication error.

### PATCH `/mobileApi/device/{device_uuid}/`

**All params:** path `device_uuid`; body `push_token` (string).

**Response when OK:** `{"code":1,"msg":"device updated successfully","result":[]}`.

**Response when fail:** `MISSING_OR_INVALID_PARAMETER`, `DEVICE_DOES_NOT_EXIST`, or authentication error.

### DELETE `/mobileApi/device/{device_uuid}/`

**All params:** path `device_uuid`.

**Response when OK:** `{"code":1,"msg":"device deleted successfully","result":[]}`.

**Response when fail:** `DEVICE_UUID_NOT_PROVIDED` or authentication error.

### POST `/mobileApi/device/verify/`

**All params:** body `device_uuid` (string), `code` (string).

**Response when OK:** `{"code":1,"msg":"device verified successfully","result":[]}`.

**Response when fail:** `NO_CUSTOMER_ID`, `CUSTOMER_DOES_NOT_EXIST`, `DEVICE_DOES_NOT_EXIST_OR_IS_NOT_ASSOCIATED`, or `INVALID_VERIFICATION_CODE`.

### GET `/mobileApi/news/`

**All params:** query `search` (optional); DRF page query `page` (optional; page size 10).

**Response when OK:** `{"code":1,"msg":"ok","result":{"count":0,"next":null,"previous":null,"results":[{"...":"NewsArticleSerializer fields"}]}}`.

**Response when fail:** authentication/pagination error.

### GET `/mobileApi/news/{id}/`

**All params:** path `id`.

**Response when OK:** `{"code":1,"msg":"ok","result":{"...":"NewsArticleSerializer fields"}}`.

**Response when fail:** DRF not-found response or authentication error.

### GET `/mobileApi/news/files/{file_name}` — Public

**All params:** path `file_name`.

**Response when OK:** stored file binary body.

**Response when fail:** `{"code":-1,"msg":"file not found","result":[]}` with HTTP 404, or a file-open error.

## Framework-generated routes

The router also exposes inherited `ModelViewSet` methods that do not have mobile-specific validation in their view. They accept the current serializer/model fields, so there is no stable hand-written parameter schema in the code.

### GET/POST `/mobileApi/dashboard/` and GET/PUT/PATCH/DELETE `/mobileApi/dashboard/{id}/`

**All params:** `Flat` serializer/model fields for write methods.

**Response when OK:** DRF `Flat` serializer response.

**Response when fail:** DRF serializer, permission, or not-found response.

### POST `/mobileApi/finance/`, PUT/PATCH/DELETE `/mobileApi/finance/{id}/`; POST `/mobileApi/documents/`, GET/PUT/PATCH/DELETE `/mobileApi/documents/{id}/`

**All params:** respective finance/document serializer/model fields.

**Response when OK:** DRF serializer response.

**Response when fail:** DRF serializer, permission, or not-found response.

### POST `/mobileApi/keys/`, GET/PUT/PATCH/DELETE `/mobileApi/keys/{id}/`; PUT/PATCH/DELETE `/mobileApi/internettv/{id}/`; PUT/PATCH/DELETE `/mobileApi/visit/{id}/`

**All params:** corresponding model serializer fields.

**Response when OK:** DRF serializer response.

**Response when fail:** DRF serializer, permission, or not-found response.

### POST `/mobileApi/notification/`, PUT/PATCH/DELETE `/mobileApi/notification/{id}/`; GET/PUT/PATCH/DELETE `/mobileApi/feedback/{id}/`

**All params:** corresponding model serializer fields.

**Response when OK:** DRF serializer response.

**Response when fail:** DRF serializer, permission, or not-found response.

### PUT/DELETE `/mobileApi/tickets/{id}/`; PUT `/mobileApi/device/{device_uuid}/`; GET/PUT/PATCH/DELETE `/mobileApi/payment/{id}/`; POST `/mobileApi/news/`, PUT/PATCH/DELETE `/mobileApi/news/{id}/`

**All params:** corresponding model serializer fields.

**Response when OK:** DRF serializer response.

**Response when fail:** DRF serializer, permission, or not-found response.
