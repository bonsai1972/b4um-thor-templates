class TasksController < ApplicationController
  before_action :require_todo_owner


  before_action :set_task, only: %i[update destroy]

  def index
    @task = Task.new
    @incomplete_tasks = tasks_scope.where(complete: false).order(created_at: :desc)
    @complete_tasks = tasks_scope.where(complete: true).order(updated_at: :desc)

    @total_tasks = @incomplete_tasks.size + @complete_tasks.size
    @completed_tasks = @complete_tasks.size
  end

  def create
    @task = tasks_scope.new(task_params)

    if @task.save
      respond_to do |format|
        format.turbo_stream do
          load_tasks

          render turbo_stream: [
            turbo_stream.prepend(
              "incomplete_tasks",
              partial: "tasks/task",
              locals: { task: @task }
            ),
            turbo_stream.replace(
              "todo_progress",
              partial: "tasks/progress"
            ),
            turbo_stream.update(
              "incomplete_tasks_count",
              "(#{@incomplete_tasks.size})"
            ),
            turbo_stream.update(
              "incomplete_tasks_empty",
              ""
            )
          ]
        end

        format.html do
          redirect_to tasks_path,
                      notice: "Aufgabe wurde erstellt."
        end
      end
    else
      load_tasks

      respond_to do |format|
        format.turbo_stream do
          render :index,
                formats: :html,
                status: :unprocessable_entity
        end

        format.html do
          render :index, status: :unprocessable_entity
        end
      end
    end
  end

  def update
    if @task.update(complete: !@task.complete)
      respond_to do |format|
        format.turbo_stream do
          load_tasks

          render turbo_stream: [
            turbo_stream.remove(
              helpers.dom_id(@task)
            ),
            turbo_stream.prepend(
              @task.complete? ? "complete_tasks" : "incomplete_tasks",
              partial: "tasks/task",
              locals: { task: @task }
            ),
            turbo_stream.replace(
              "todo_progress",
              partial: "tasks/progress"
            ),
            turbo_stream.update(
              "incomplete_tasks_count",
              "(#{@incomplete_tasks.size})"
            ),
            turbo_stream.update(
              "complete_tasks_count",
              "(#{@complete_tasks.size})"
            ),
            turbo_stream.update(
              "incomplete_tasks_empty",
              @incomplete_tasks.empty? ? '<p class="b4um-todo__empty">Keine offenen Aufgaben. Sehr gut!</p>'.html_safe : ""
            ),
            turbo_stream.update(
              "complete_tasks_empty",
              @complete_tasks.empty? ? '<p class="b4um-todo__empty">Noch keine erledigten Aufgaben.</p>'.html_safe : ""
            )
          ]
        end

        format.html do
          redirect_to tasks_path
        end
      end
    else
      redirect_to tasks_path,
                  alert: "Aufgabe konnte nicht aktualisiert werden."
    end
  end

  def destroy
    @task.destroy!

    respond_to do |format|
      format.turbo_stream do
        load_tasks

        render turbo_stream: [
          turbo_stream.remove(
            helpers.dom_id(@task)
          ),
          turbo_stream.replace(
            "todo_progress",
            partial: "tasks/progress"
          ),
          turbo_stream.update(
            "incomplete_tasks_count",
            "(#{@incomplete_tasks.size})"
          ),
          turbo_stream.update(
            "complete_tasks_count",
            "(#{@complete_tasks.size})"
          ),
          turbo_stream.update(
            "incomplete_tasks_empty",
            @incomplete_tasks.empty? ? '<p class="b4um-todo__empty">Keine offenen Aufgaben. Sehr gut!</p>'.html_safe : ""
          ),
          turbo_stream.update(
            "complete_tasks_empty",
            @complete_tasks.empty? ? '<p class="b4um-todo__empty">Noch keine erledigten Aufgaben.</p>'.html_safe : ""
          )
        ]
      end

      format.html do
        redirect_to tasks_path,
                    notice: "Aufgabe wurde gelöscht."
      end
    end
  end

  private

  def tasks_scope
    current_user.tasks
  end

  def set_task
    @task = tasks_scope.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:name)
  end

  def load_tasks
  @incomplete_tasks = tasks_scope.where(complete: false).order(created_at: :desc)
    @complete_tasks = tasks_scope.where(complete: true).order(updated_at: :desc)

    @total_tasks = @incomplete_tasks.size + @complete_tasks.size
    @completed_tasks = @complete_tasks.size
  end


  def require_todo_owner
    return if current_user

    redirect_to login_path,
            alert: "Bitte melde dich an, um deine Aufgaben zu verwalten."
  end
end
