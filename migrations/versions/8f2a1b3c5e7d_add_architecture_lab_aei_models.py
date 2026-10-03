"""add architecture lab and aei domain models

Revision ID: 8f2a1b3c5e7d
Revises: 7e8a9b0c1d2e
Create Date: 2026-10-03 12:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2a1b3c5e7d'
down_revision: Union[str, Sequence[str], None] = '7e8a9b0c1d2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Hypotheses
    op.create_table(
        'lab_hypotheses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='DRAFT', nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_hypotheses_created_by'), 'lab_hypotheses', ['created_by'], unique=False)
    op.create_index(op.f('ix_lab_hypotheses_organization_id'), 'lab_hypotheses', ['organization_id'], unique=False)
    op.create_index(op.f('ix_lab_hypotheses_repository_id'), 'lab_hypotheses', ['repository_id'], unique=False)
    op.create_index(op.f('ix_lab_hypotheses_status'), 'lab_hypotheses', ['status'], unique=False)

    # 2. Interventions
    op.create_table(
        'lab_interventions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hypothesis_id', sa.Integer(), nullable=False),
        sa.Column('intervention_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_component_ids', sa.JSON(), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['hypothesis_id'], ['lab_hypotheses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_interventions_hypothesis_id'), 'lab_interventions', ['hypothesis_id'], unique=False)
    op.create_index(op.f('ix_lab_interventions_intervention_type'), 'lab_interventions', ['intervention_type'], unique=False)

    # 3. Experiments
    op.create_table(
        'lab_experiments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hypothesis_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='DRAFT', nullable=False),
        sa.Column('baseline_reference', sa.JSON(), nullable=False),
        sa.Column('proposed_reference', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['hypothesis_id'], ['lab_hypotheses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_experiments_created_by'), 'lab_experiments', ['created_by'], unique=False)
    op.create_index(op.f('ix_lab_experiments_hypothesis_id'), 'lab_experiments', ['hypothesis_id'], unique=False)
    op.create_index(op.f('ix_lab_experiments_status'), 'lab_experiments', ['status'], unique=False)

    # 4. Experiment Runs
    op.create_table(
        'lab_experiment_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('run_number', sa.Integer(), server_default='1', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['lab_experiments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_experiment_runs_experiment_id'), 'lab_experiment_runs', ['experiment_id'], unique=False)
    op.create_index(op.f('ix_lab_experiment_runs_status'), 'lab_experiment_runs', ['status'], unique=False)

    # 5. Workload Profiles
    op.create_table(
        'lab_workload_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('requests_per_second', sa.Float(), nullable=True),
        sa.Column('batch_volume', sa.Float(), nullable=True),
        sa.Column('concurrency', sa.Integer(), nullable=True),
        sa.Column('read_write_ratio', sa.Float(), nullable=True),
        sa.Column('data_volume_gb', sa.Float(), nullable=True),
        sa.Column('workload_pattern', sa.String(length=100), server_default='steady', nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=False),
        sa.Column('is_measured', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_workload_profiles_organization_id'), 'lab_workload_profiles', ['organization_id'], unique=False)
    op.create_index(op.f('ix_lab_workload_profiles_repository_id'), 'lab_workload_profiles', ['repository_id'], unique=False)

    # 6. Resource Profiles
    op.create_table(
        'lab_resource_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('provider', sa.String(length=50), server_default='generic', nullable=False),
        sa.Column('region', sa.String(length=50), server_default='us-east-1', nullable=False),
        sa.Column('cpu', sa.String(length=50), nullable=True),
        sa.Column('memory', sa.String(length=50), nullable=True),
        sa.Column('database_class', sa.String(length=100), nullable=True),
        sa.Column('replicas', sa.Integer(), server_default='1', nullable=False),
        sa.Column('storage_gb', sa.Float(), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_resource_profiles_organization_id'), 'lab_resource_profiles', ['organization_id'], unique=False)
    op.create_index(op.f('ix_lab_resource_profiles_repository_id'), 'lab_resource_profiles', ['repository_id'], unique=False)

    # 7. Pricing Snapshots
    op.create_table(
        'lab_pricing_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('region', sa.String(length=50), nullable=False),
        sa.Column('pricing_source', sa.String(length=100), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='USD', nullable=False),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('pricing_data', sa.JSON(), nullable=False),
        sa.Column('source_metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_pricing_snapshots_provider'), 'lab_pricing_snapshots', ['provider'], unique=False)
    op.create_index(op.f('ix_lab_pricing_snapshots_region'), 'lab_pricing_snapshots', ['region'], unique=False)

    # 8. Evidence Ledger
    op.create_table(
        'lab_evidence_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('hypothesis_id', sa.Integer(), nullable=True),
        sa.Column('experiment_id', sa.Integer(), nullable=True),
        sa.Column('run_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('source_type', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('claim', sa.Text(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('provenance', sa.JSON(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['lab_experiments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['hypothesis_id'], ['lab_hypotheses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['run_id'], ['lab_experiment_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_evidence_ledger_category'), 'lab_evidence_ledger', ['category'], unique=False)
    op.create_index(op.f('ix_lab_evidence_ledger_experiment_id'), 'lab_evidence_ledger', ['experiment_id'], unique=False)
    op.create_index(op.f('ix_lab_evidence_ledger_hypothesis_id'), 'lab_evidence_ledger', ['hypothesis_id'], unique=False)
    op.create_index(op.f('ix_lab_evidence_ledger_organization_id'), 'lab_evidence_ledger', ['organization_id'], unique=False)
    op.create_index(op.f('ix_lab_evidence_ledger_repository_id'), 'lab_evidence_ledger', ['repository_id'], unique=False)
    op.create_index(op.f('ix_lab_evidence_ledger_run_id'), 'lab_evidence_ledger', ['run_id'], unique=False)

    # 9. Cost Scenarios
    op.create_table(
        'lab_cost_scenarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('run_id', sa.Integer(), nullable=True),
        sa.Column('workload_profile_id', sa.Integer(), nullable=True),
        sa.Column('resource_profile_id', sa.Integer(), nullable=True),
        sa.Column('pricing_snapshot_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assumptions', sa.JSON(), nullable=False),
        sa.Column('estimated_cost_outputs', sa.JSON(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='USD', nullable=False),
        sa.Column('calculation_metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['lab_experiments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pricing_snapshot_id'], ['lab_pricing_snapshots.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['resource_profile_id'], ['lab_resource_profiles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['run_id'], ['lab_experiment_runs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workload_profile_id'], ['lab_workload_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_cost_scenarios_experiment_id'), 'lab_cost_scenarios', ['experiment_id'], unique=False)
    op.create_index(op.f('ix_lab_cost_scenarios_pricing_snapshot_id'), 'lab_cost_scenarios', ['pricing_snapshot_id'], unique=False)
    op.create_index(op.f('ix_lab_cost_scenarios_resource_profile_id'), 'lab_cost_scenarios', ['resource_profile_id'], unique=False)
    op.create_index(op.f('ix_lab_cost_scenarios_run_id'), 'lab_cost_scenarios', ['run_id'], unique=False)
    op.create_index(op.f('ix_lab_cost_scenarios_workload_profile_id'), 'lab_cost_scenarios', ['workload_profile_id'], unique=False)

    # 10. Decision Records
    op.create_table(
        'lab_decision_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hypothesis_id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=True),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('selected_intervention_id', sa.Integer(), nullable=True),
        sa.Column('supporting_evidence_ids', sa.JSON(), nullable=False),
        sa.Column('decision_maker', sa.String(length=255), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['experiment_id'], ['lab_experiments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['hypothesis_id'], ['lab_hypotheses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['selected_intervention_id'], ['lab_interventions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_decision_records_created_by'), 'lab_decision_records', ['created_by'], unique=False)
    op.create_index(op.f('ix_lab_decision_records_decision'), 'lab_decision_records', ['decision'], unique=False)
    op.create_index(op.f('ix_lab_decision_records_experiment_id'), 'lab_decision_records', ['experiment_id'], unique=False)
    op.create_index(op.f('ix_lab_decision_records_hypothesis_id'), 'lab_decision_records', ['hypothesis_id'], unique=False)
    op.create_index(op.f('ix_lab_decision_records_selected_intervention_id'), 'lab_decision_records', ['selected_intervention_id'], unique=False)


def downgrade() -> None:
    op.drop_table('lab_decision_records')
    op.drop_table('lab_cost_scenarios')
    op.drop_table('lab_evidence_ledger')
    op.drop_table('lab_pricing_snapshots')
    op.drop_table('lab_resource_profiles')
    op.drop_table('lab_workload_profiles')
    op.drop_table('lab_experiment_runs')
    op.drop_table('lab_experiments')
    op.drop_table('lab_interventions')
    op.drop_table('lab_hypotheses')
