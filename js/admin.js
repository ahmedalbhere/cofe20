document.addEventListener('DOMContentLoaded', function() {
    // عناصر واجهة المستخدم
    const ordersTab = document.getElementById('ordersTab');
    const menuTab = document.getElementById('menuTab');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const ordersList = document.getElementById('ordersList');
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    const menuItemsList = document.getElementById('menuItemsList');
    const addMenuItemBtn = document.getElementById('addMenuItemBtn');
    const menuItemModal = document.getElementById('menuItemModal');
    const menuItemForm = document.getElementById('menuItemForm');
    const modalTitle = document.getElementById('modalTitle');
    const cancelMenuItemBtn = document.getElementById('cancelMenuItemBtn');
    const saveMenuItemBtn = document.getElementById('saveMenuItemBtn');
    const itemIdInput = document.getElementById('itemId');
    const itemNameInput = document.getElementById('itemName');
    const itemCategoryInput = document.getElementById('itemCategory');
    const itemPriceInput = document.getElementById('itemPrice');
    const itemDescriptionInput = document.getElementById('itemDescription');

    // متغيرات الحالة
    let isEditMode = false;
    let currentEditItemId = null;

    // تهيئة الصفحة
    init();

    function init() {
        setupEventListeners();
        loadOrders();
    }

    function setupEventListeners() {
        // تبديل التبويبات
        tabButtons.forEach(button => {
            button.addEventListener('click', handleTabSwitch);
        });

        // تصفية الطلبات
        orderStatusFilter.addEventListener('change', loadOrders);

        // إدارة القائمة
        addMenuItemBtn.addEventListener('click', () => openMenuItemModal());
        cancelMenuItemBtn.addEventListener('click', closeMenuItemModal);
        menuItemForm.addEventListener('submit', handleMenuItemSubmit);

        // تفاعلات القائمة
        menuItemsList.addEventListener('click', handleMenuItemsListClick);

        // تفاعلات الطلبات
        ordersList.addEventListener('change', handleOrderStatusChange);
        ordersList.addEventListener('click', handleOrderActions);
    }

    // معالجة تبديل التبويبات
    function handleTabSwitch(e) {
        const tabId = e.target.getAttribute('data-tab');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        ordersTab.classList.remove('active');
        menuTab.classList.remove('active');
        
        if (tabId === 'orders') {
            ordersTab.classList.add('active');
            loadOrders();
        } else {
            menuTab.classList.add('active');
            loadMenuItems();
        }
    }

    // تحميل الطلبات من Firebase
    function loadOrders() {
        showLoading(ordersList);
        
        database.ref('orders').orderByChild('timestamp').on('value', (snapshot) => {
            ordersList.innerHTML = '';
            
            if (!snapshot.exists()) {
                ordersList.innerHTML = '<p class="no-data">لا توجد طلبات حالية</p>';
                return;
            }
            
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                order.id = childSnapshot.key;
                
                // تطبيق الفلتر
                const statusFilter = orderStatusFilter.value;
                if (statusFilter !== 'all' && order.status !== statusFilter) {
                    return;
                }
                
                renderOrder(order);
            });
        }, (error) => {
            showMessage('حدث خطأ أثناء تحميل الطلبات: ' + error.message, 'error');
        });
    }

    // عرض الطلب في الواجهة
    function renderOrder(order) {
        const orderElement = document.createElement('div');
        orderElement.className = `order-card ${order.status}`;
        orderElement.innerHTML = `
            <div class="order-header">
                <h3>الطاولة رقم ${order.tableNumber}</h3>
                <span class="order-status">${getStatusText(order.status)}</span>
                <span class="order-time">${formatTime(order.timestamp)}</span>
            </div>
            <div class="order-details">
                <ul class="order-items">
                    ${order.items.map(item => `
                        <li>
                            ${item.quantity} × ${item.name} - ${item.price * item.quantity} ج.م
                            ${item.notes ? `<br><small>ملاحظات: ${item.notes}</small>` : ''}
                        </li>
                    `).join('')}
                </ul>
                <div class="order-total">
                    <strong>المجموع:</strong> ${order.total} ج.م
                </div>
            </div>
            <div class="order-actions">
                <select class="status-select" data-order-id="${order.id}">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>قيد التحضير</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>جاهزة للتقديم</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>مكتملة</option>
                </select>
                <button class="delete-order-btn" data-order-id="${order.id}">حذف</button>
            </div>
        `;
        ordersList.appendChild(orderElement);
    }

    // معالجة تغيير حالة الطلب
    function handleOrderStatusChange(e) {
        if (e.target.classList.contains('status-select')) {
            const orderId = e.target.getAttribute('data-order-id');
            const newStatus = e.target.value;
            
            database.ref(`orders/${orderId}/status`).set(newStatus)
                .then(() => {
                    showMessage('تم تحديث حالة الطلب بنجاح', 'success');
                })
                .catch(error => {
                    showMessage('حدث خطأ أثناء تحديث الحالة: ' + error.message, 'error');
                });
        }
    }

    // معالجة إجراءات الطلب (حذف)
    function handleOrderActions(e) {
        if (e.target.classList.contains('delete-order-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            
            if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
                database.ref(`orders/${orderId}`).remove()
                    .then(() => {
                        showMessage('تم حذف الطلب بنجاح', 'success');
                    })
                    .catch(error => {
                        showMessage('حدث خطأ أثناء حذف الطلب: ' + error.message, 'error');
                    });
            }
        }
    }

    // تحميل عناصر القائمة من Firebase
    function loadMenuItems() {
        showLoading(menuItemsList);
        
        database.ref('menu').on('value', (snapshot) => {
            menuItemsList.innerHTML = '';
            
            if (!snapshot.exists()) {
                menuItemsList.innerHTML = '<p class="no-data">لا توجد أصناف في القائمة</p>';
                return;
            }
            
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                item.id = childSnapshot.key;
                renderMenuItem(item);
            });
        }, (error) => {
            showMessage('حدث خطأ أثناء تحميل القائمة: ' + error.message, 'error');
        });
    }

    // عرض عنصر القائمة في الواجهة
    function renderMenuItem(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'menu-item-card';
        itemElement.innerHTML = `
            <div class="menu-item-info">
                <h4>${item.name}</h4>
                <p class="item-category">${getCategoryText(item.category)}</p>
                <p class="item-price">${item.price} ج.م</p>
                ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
            </div>
            <div class="menu-item-actions">
                <button class="edit-item-btn" data-item-id="${item.id}">تعديل</button>
                <button class="delete-item-btn" data-item-id="${item.id}">حذف</button>
            </div>
        `;
        menuItemsList.appendChild(itemElement);
    }

    // معالجة النقر على عناصر القائمة (تعديل/حذف)
    function handleMenuItemsListClick(e) {
        if (e.target.classList.contains('edit-item-btn')) {
            const itemId = e.target.getAttribute('data-item-id');
            database.ref(`menu/${itemId}`).once('value', (snapshot) => {
                openMenuItemModal(snapshot.val());
            });
        }
        
        if (e.target.classList.contains('delete-item-btn')) {
            const itemId = e.target.getAttribute('data-item-id');
            if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
                database.ref(`menu/${itemId}`).remove()
                    .then(() => {
                        showMessage('تم حذف الصنف بنجاح', 'success');
                    })
                    .catch(error => {
                        showMessage('حدث خطأ أثناء حذف الصنف: ' + error.message, 'error');
                    });
            }
        }
    }

    // فتح نموذج إضافة/تعديل عنصر
    function openMenuItemModal(item = null) {
        isEditMode = item !== null;
        
        if (isEditMode) {
            modalTitle.textContent = 'تعديل الصنف';
            currentEditItemId = item.id;
            itemIdInput.value = item.id;
            itemNameInput.value = item.name;
            itemCategoryInput.value = item.category;
            itemPriceInput.value = item.price;
            itemDescriptionInput.value = item.description || '';
        } else {
            modalTitle.textContent = 'إضافة صنف جديد';
            currentEditItemId = null;
            menuItemForm.reset();
        }
        
        menuItemModal.classList.remove('hidden');
        itemNameInput.focus();
    }

    // إغلاق النموذج
    function closeMenuItemModal() {
        menuItemModal.classList.add('hidden');
    }

    // معالجة تقديم نموذج العنصر
    function handleMenuItemSubmit(e) {
        e.preventDefault();
        
        // التحقق من صحة البيانات
        if (!itemNameInput.value.trim()) {
            showMessage('الرجاء إدخال اسم الصنف', 'error');
            itemNameInput.focus();
            return;
        }
        
        const price = parseFloat(itemPriceInput.value);
        if (isNaN(price) {
            showMessage('الرجاء إدخال سعر صحيح', 'error');
            itemPriceInput.focus();
            return;
        }
        
        const itemData = {
            name: itemNameInput.value.trim(),
            category: itemCategoryInput.value,
            price: price,
            description: itemDescriptionInput.value.trim() || null
        };
        
        if (isEditMode) {
            // حالة التعديل
            database.ref(`menu/${currentEditItemId}`).update(itemData)
                .then(() => {
                    closeMenuItemModal();
                    showMessage('تم تحديث الصنف بنجاح', 'success');
                })
                .catch(error => {
                    showMessage('حدث خطأ أثناء التحديث: ' + error.message, 'error');
                });
        } else {
            // حالة الإضافة
            database.ref('menu').push(itemData)
                .then(() => {
                    closeMenuItemModal();
                    showMessage('تم إضافة الصنف بنجاح', 'success');
                })
                .catch(error => {
                    showMessage('حدث خطأ أثناء الإضافة: ' + error.message, 'error');
                });
        }
    }

    // وظائف مساعدة
    function getStatusText(status) {
        const statusMap = {
            'pending': 'قيد الانتظار',
            'preparing': 'قيد التحضير',
            'ready': 'جاهزة للتقديم',
            'completed': 'مكتملة'
        };
        return statusMap[status] || status;
    }

    function getCategoryText(category) {
        const categoryMap = {
            'hot-drinks': 'مشروبات ساخنة',
            'cold-drinks': 'مشروبات باردة',
            'food': 'أطعمة'
        };
        return categoryMap[category] || category;
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-EG') + ' - ' + date.toLocaleDateString('ar-EG');
    }

    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    function showLoading(container) {
        container.innerHTML = '<div class="loading-spinner"></div>';
    }
});
