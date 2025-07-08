document.addEventListener('DOMContentLoaded', function() {
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

    let isEditMode = false;
    let currentEditItemId = null;

    // تبديل بين تبويبات الإدارة
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            ordersTab.classList.remove('active');
            menuTab.classList.remove('active');
            
            if (tabId === 'orders') {
                ordersTab.classList.add('active');
                loadOrders();
            } else {
                menuTab.classList.add('active');
                loadMenuItems();
            }
        });
    });

    // تحميل الطلبات
    function loadOrders() {
        database.ref('orders').on('value', (snapshot) => {
            ordersList.innerHTML = '';
            
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
        });
    }

    // عرض الطلب
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

    // نص حالة الطلب
    function getStatusText(status) {
        const statusMap = {
            'pending': 'قيد الانتظار',
            'preparing': 'قيد التحضير',
            'ready': 'جاهزة للتقديم',
            'completed': 'مكتملة'
        };
        return statusMap[status] || status;
    }

    // تنسيق الوقت
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-EG');
    }

    // تحديث حالة الطلب
    ordersList.addEventListener('change', function(e) {
        if (e.target.classList.contains('status-select')) {
            const orderId = e.target.getAttribute('data-order-id');
            const newStatus = e.target.value;
            
            database.ref(`orders/${orderId}/status`).set(newStatus);
        }
    });

    // حذف الطلب
    ordersList.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-order-btn')) {
            if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
                const orderId = e.target.getAttribute('data-order-id');
                database.ref(`orders/${orderId}`).remove();
            }
        }
    });

    // تصفية الطلبات حسب الحالة
    orderStatusFilter.addEventListener('change', loadOrders);

    // تحميل عناصر القائمة
    function loadMenuItems() {
        database.ref('menu').on('value', (snapshot) => {
            menuItemsList.innerHTML = '';
            
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                item.id = childSnapshot.key;
                renderMenuItem(item);
            });
        });
    }

    // عرض عنصر القائمة
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

    // نص فئة العنصر
    function getCategoryText(category) {
        const categoryMap = {
            'hot-drinks': 'مشروبات ساخنة',
            'cold-drinks': 'مشروبات باردة',
            'food': 'أطعمة'
        };
        return categoryMap[category] || category;
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
    }

    // إضافة عنصر جديد
    addMenuItemBtn.addEventListener('click', function() {
        openMenuItemModal();
    });

    // تعديل عنصر موجود
    menuItemsList.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-item-btn')) {
            const itemId = e.target.getAttribute('data-item-id');
            database.ref(`menu/${itemId}`).once('value', (snapshot) => {
                openMenuItemModal(snapshot.val());
            });
        }
    });

    // حذف عنصر
    menuItemsList.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-item-btn')) {
            const itemId = e.target.getAttribute('data-item-id');
            if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
                database.ref(`menu/${itemId}`).remove();
            }
        }
    });

    // حفظ العنصر
    menuItemForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const itemData = {
            name: itemNameInput.value.trim(),
            category: itemCategoryInput.value,
            price: parseFloat(itemPriceInput.value),
            description: itemDescriptionInput.value.trim() || null
        };
        
        if (isEditMode) {
            database.ref(`menu/${currentEditItemId}`).update(itemData)
                .then(() => {
                    closeMenuItemModal();
                });
        } else {
            database.ref('menu').push(itemData)
                .then(() => {
                    closeMenuItemModal();
                });
        }
    });

    // إلغاء النموذج
    cancelMenuItemBtn.addEventListener('click', closeMenuItemModal);

    // إغلاق النموذج
    function closeMenuItemModal() {
        menuItemModal.classList.add('hidden');
    }

    // تحميل الطلبات عند البدء
    loadOrders();
});
